import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const metaToken = Deno.env.get("META_ACCESS_TOKEN")!;

const supabase = createClient(supabaseUrl, supabaseKey);

const META_API_BASE = "https://graph.facebook.com/v21.0";

Deno.serve(async (_req) => {
  try {
    // Get all active funnels with Meta campaign IDs
    const { data: funnels } = await supabase
      .from("funnels")
      .select("id, name, meta_campaign_ids")
      .eq("status", "active")
      .not("meta_campaign_ids", "is", null);

    if (!funnels?.length) {
      return new Response(JSON.stringify({ message: "No funnels with campaigns" }));
    }

    const results = [];

    for (const funnel of funnels) {
      const campaignIds = funnel.meta_campaign_ids || [];

      for (const campaignId of campaignIds) {
        try {
          const insights = await fetchCampaignInsights(campaignId);
          if (insights) {
            await storeAdMetrics(funnel.id, campaignId, insights);
            results.push({ campaign: campaignId, status: "synced" });
          }
        } catch (err) {
          results.push({
            campaign: campaignId,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    return new Response(JSON.stringify({ synced: results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500 }
    );
  }
});

async function fetchCampaignInsights(campaignId: string) {
  const fields = "impressions,clicks,spend,actions,cost_per_action_type,ctr,cpc,cpp,frequency,reach";
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify({
      since: yesterday.toISOString().split("T")[0],
      until: now.toISOString().split("T")[0],
    }),
    access_token: metaToken,
  });

  const response = await fetch(`${META_API_BASE}/${campaignId}/insights?${params}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meta API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.data?.[0] || null;
}

async function storeAdMetrics(
  funnelId: string,
  campaignId: string,
  insights: Record<string, unknown>
) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Extract lead conversions from actions
  const actions = (insights.actions as Array<Record<string, string>>) || [];
  const leadAction = actions.find((a) => a.action_type === "lead");
  const leads = leadAction ? parseInt(leadAction.value) : 0;

  const conversions = actions.reduce(
    (sum, a) =>
      ["lead", "purchase", "complete_registration"].includes(a.action_type)
        ? sum + parseInt(a.value)
        : sum,
    0
  );

  await supabase.from("ad_metrics").insert({
    funnel_id: funnelId,
    meta_campaign_id: campaignId,
    period_start: yesterday.toISOString(),
    period_end: now.toISOString(),
    impressions: parseInt(insights.impressions as string) || 0,
    clicks: parseInt(insights.clicks as string) || 0,
    spend_cents: Math.round(parseFloat(insights.spend as string) * 100) || 0,
    conversions,
    leads,
    frequency: parseFloat(insights.frequency as string) || null,
    raw_payload: insights,
  });

  // Also create metric_snapshots for funnel stage tracking
  // Find the ad stage for this funnel
  const { data: adStage } = await supabase
    .from("funnel_stages")
    .select("id")
    .eq("funnel_id", funnelId)
    .in("stage_type", ["ad_impression", "ad_click"])
    .limit(1)
    .single();

  if (adStage) {
    const impressions = parseInt(insights.impressions as string) || 0;
    const clicks = parseInt(insights.clicks as string) || 0;
    const ctr = impressions > 0 ? clicks / impressions : 0;

    await supabase.from("metric_snapshots").insert({
      funnel_stage_id: adStage.id,
      period_start: yesterday.toISOString(),
      period_end: now.toISOString(),
      metric_name: "conversion_rate",
      metric_value: ctr,
      sample_size: impressions,
      source: "meta_ads",
    });
  }
}

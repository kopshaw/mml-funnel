import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCampaignInsights } from "@/lib/integrations/meta-ads";

/**
 * Sync Meta Ads metrics for all active funnels.
 * Called by cron every 30 minutes.
 */
export async function POST() {
  const supabase = createAdminClient();

  try {
    const { data: funnels } = await supabase
      .from("funnels")
      .select("id, name, meta_campaign_ids")
      .eq("status", "active")
      .not("meta_campaign_ids", "is", null);

    if (!funnels?.length) {
      return NextResponse.json({ status: "no_active_campaigns", synced: 0 });
    }

    let synced = 0;
    const errors: string[] = [];

    for (const funnel of funnels) {
      const campaignIds = funnel.meta_campaign_ids || [];
      for (const campaignId of campaignIds) {
        try {
          const now = new Date();
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          const insightsArr = await getCampaignInsights(campaignId, {
            since: yesterday.toISOString().split("T")[0],
            until: now.toISOString().split("T")[0],
          });

          if (insightsArr?.length) {
            const insights = insightsArr[0];
            await supabase.from("ad_metrics").insert({
              funnel_id: funnel.id,
              meta_campaign_id: campaignId,
              period_start: yesterday.toISOString(),
              period_end: now.toISOString(),
              impressions: insights.impressions || 0,
              clicks: insights.clicks || 0,
              spend_cents: Math.round((insights.spend || 0) * 100),
              conversions: insights.conversions || 0,
              leads: 0,
              raw_payload: insights as unknown as Record<string, unknown>,
            });
            synced++;
          }
        } catch (err) {
          errors.push(`${campaignId}: ${err instanceof Error ? err.message : "unknown"}`);
        }
      }
    }

    return NextResponse.json({ status: "sync_complete", synced, errors, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

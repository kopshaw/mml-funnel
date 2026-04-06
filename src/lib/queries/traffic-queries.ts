import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Traffic sources (contacts grouped by source)
// ---------------------------------------------------------------------------

export async function getTrafficSources(clientId?: string) {
  const supabase = createAdminClient();

  let query = supabase.from("contacts").select("source");

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getTrafficSources error:", error.message);
    return [];
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const src = (row.source as string) ?? "unknown";
    counts[src] = (counts[src] ?? 0) + 1;
  }

  return Object.entries(counts).map(([source, count]) => ({ source, count }));
}

// ---------------------------------------------------------------------------
// Ad spend time-series (daily spend_cents, last N days)
// ---------------------------------------------------------------------------

export async function getSpendTimeSeries(clientId?: string, days = 30) {
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  let query = supabase
    .from("ad_metrics")
    .select("spend_cents, period_start")
    .gte("period_start", since.toISOString())
    .order("period_start", { ascending: true });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getSpendTimeSeries error:", error.message);
    return [];
  }

  const grouped: Record<string, number> = {};
  for (const row of data ?? []) {
    const date = (row.period_start as string).slice(0, 10);
    grouped[date] = (grouped[date] ?? 0) + Number(row.spend_cents ?? 0);
  }

  return Object.entries(grouped).map(([date, spend_cents]) => ({
    date,
    spend_cents,
  }));
}

// ---------------------------------------------------------------------------
// Campaign performance (ad_metrics grouped by meta_campaign_id)
// ---------------------------------------------------------------------------

export async function getCampaignPerformance(clientId?: string) {
  const supabase = createAdminClient();

  let query = supabase
    .from("ad_metrics")
    .select(
      "meta_campaign_id, impressions, clicks, spend_cents, conversions, leads"
    );

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getCampaignPerformance error:", error.message);
    return [];
  }

  const campaigns: Record<
    string,
    {
      meta_campaign_id: string;
      impressions: number;
      clicks: number;
      spend_cents: number;
      conversions: number;
      leads: number;
    }
  > = {};

  for (const row of data ?? []) {
    const id = (row.meta_campaign_id as string) ?? "unknown";
    if (!campaigns[id]) {
      campaigns[id] = {
        meta_campaign_id: id,
        impressions: 0,
        clicks: 0,
        spend_cents: 0,
        conversions: 0,
        leads: 0,
      };
    }
    campaigns[id].impressions += Number(row.impressions ?? 0);
    campaigns[id].clicks += Number(row.clicks ?? 0);
    campaigns[id].spend_cents += Number(row.spend_cents ?? 0);
    campaigns[id].conversions += Number(row.conversions ?? 0);
    campaigns[id].leads += Number(row.leads ?? 0);
  }

  return Object.values(campaigns);
}

// ---------------------------------------------------------------------------
// Top ads (lowest cost per lead)
// ---------------------------------------------------------------------------

export async function getTopAds(clientId?: string, limit = 5) {
  const supabase = createAdminClient();

  let query = supabase
    .from("ad_metrics")
    .select(
      "meta_campaign_id, meta_adset_id, meta_ad_id, spend_cents, leads, cpl_cents, impressions, clicks"
    )
    .gt("leads", 0)
    .order("cpl_cents", { ascending: true })
    .limit(limit);

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getTopAds error:", error.message);
    return [];
  }

  return data ?? [];
}

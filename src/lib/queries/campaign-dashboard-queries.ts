import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Campaign-specific dashboard queries
// ---------------------------------------------------------------------------

export type Timeframe = "7d" | "30d" | "lifetime";

export interface CampaignDashboardData {
  // KPIs
  kpis: {
    revenue_cents: number;
    revenue_delta_pct: number | null; // vs previous period
    leads: number;
    leads_delta_pct: number | null;
    ad_spend_cents: number;
    ad_spend_delta_pct: number | null;
    roas: number | null;
    roas_delta: number | null;
    conversion_rate: number | null;
    conversion_rate_delta: number | null;
  };

  // Time series for charts
  revenue_timeseries: { date: string; revenue_cents: number }[];
  leads_timeseries: { date: string; leads: number }[];

  // Funnel conversion drop-off
  stage_conversion: {
    stage_name: string;
    stage_order: number;
    count: number;
    rate_from_previous: number | null;
  }[];

  // Top ads by CTR (or spend)
  top_ads: {
    id: string;
    headline: string;
    impressions: number;
    clicks: number;
    ctr: number;
    spend_cents: number;
    status: string;
  }[];

  // Email performance
  email_performance: {
    step_order: number;
    subject: string;
    sent: number;
    open_rate: number;
    click_rate: number;
  }[];

  // Recent SOPHIA activity
  recent_activity: {
    id: string;
    action_type: string;
    diagnosis: string;
    status: string;
    impact_verdict?: string;
    impact_delta?: number;
    risk_tier: string;
    created_at: string;
  }[];

  // Variant comparison (A/B test)
  variant_comparison: {
    variant_label: string;
    impressions: number;
    conversions: number;
    conversion_rate: number;
    is_control: boolean;
  }[];

  // Metadata
  funnel_id: string | null;
  timeframe: Timeframe;
  period_start: string;
  period_end: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeframeRange(tf: Timeframe): { start: Date; end: Date; previous_start: Date; previous_end: Date } {
  const end = new Date();
  let days: number;
  switch (tf) {
    case "7d":
      days = 7;
      break;
    case "30d":
      days = 30;
      break;
    case "lifetime":
      // Arbitrarily far back for lifetime — 10 years
      days = 3650;
      break;
  }
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const previous_end = new Date(start.getTime());
  const previous_start = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end, previous_start, previous_end };
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function groupByDay<T extends { occurred_at?: string; sent_at?: string; created_at?: string }>(
  rows: T[],
  pickDate: (r: T) => string | undefined,
  valueFn: (r: T) => number
): { date: string; value: number }[] {
  const acc: Record<string, number> = {};
  for (const r of rows) {
    const d = pickDate(r);
    if (!d) continue;
    const day = d.slice(0, 10);
    acc[day] = (acc[day] ?? 0) + valueFn(r);
  }
  return Object.entries(acc)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

export async function getCampaignDashboard(
  briefId: string,
  timeframe: Timeframe = "30d"
): Promise<CampaignDashboardData | null> {
  const supabase = createAdminClient();

  // Load brief to get funnel_id
  const { data: brief } = await supabase
    .from("campaign_briefs")
    .select("id, funnel_id")
    .eq("id", briefId)
    .single() as { data: { id: string; funnel_id: string | null } | null };

  if (!brief) return null;
  const funnelId = brief.funnel_id;

  const { start, end, previous_start, previous_end } = timeframeRange(timeframe);

  // No funnel yet → return empty
  if (!funnelId) {
    return emptyDashboard(timeframe, start, end);
  }

  // Parallel load
  const [
    currentEventsRes,
    previousEventsRes,
    currentContactsRes,
    previousContactsRes,
    stagesRes,
    currentMetricsRes,
    previousMetricsRes,
    adsRes,
    sendLogRes,
    emailStepsRes,
    actionsRes,
    abTestsRes,
  ] = await Promise.all([
    supabase
      .from("pipeline_events")
      .select("event_type, event_data, funnel_stage_id, occurred_at")
      .eq("funnel_id", funnelId)
      .gte("occurred_at", start.toISOString())
      .lte("occurred_at", end.toISOString()),
    supabase
      .from("pipeline_events")
      .select("event_type, event_data, occurred_at")
      .eq("funnel_id", funnelId)
      .gte("occurred_at", previous_start.toISOString())
      .lt("occurred_at", previous_end.toISOString()),
    supabase
      .from("contacts")
      .select("id, created_at")
      .eq("source_funnel_id", funnelId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString()),
    supabase
      .from("contacts")
      .select("id, created_at")
      .eq("source_funnel_id", funnelId)
      .gte("created_at", previous_start.toISOString())
      .lt("created_at", previous_end.toISOString()),
    supabase
      .from("funnel_stages")
      .select("id, stage_name, stage_type, stage_order")
      .eq("funnel_id", funnelId)
      .order("stage_order"),
    supabase
      .from("ad_metrics")
      .select("ad_creative_id, impressions, clicks, spend_cents, metric_date")
      .gte("metric_date", start.toISOString().slice(0, 10))
      .lte("metric_date", end.toISOString().slice(0, 10)),
    supabase
      .from("ad_metrics")
      .select("spend_cents, metric_date")
      .gte("metric_date", previous_start.toISOString().slice(0, 10))
      .lt("metric_date", previous_end.toISOString().slice(0, 10)),
    supabase
      .from("ad_creatives")
      .select("id, headline, status")
      .eq("funnel_id", funnelId),
    supabase
      .from("send_log")
      .select("sequence_step_id, channel, status, sent_at")
      .gte("sent_at", start.toISOString())
      .lte("sent_at", end.toISOString()),
    supabase
      .from("email_sequence_steps")
      .select("id, step_order, subject"),
    supabase
      .from("optimization_actions")
      .select("id, action_type, diagnosis, status, impact_verdict, impact_delta, risk_tier, created_at")
      .eq("funnel_id", funnelId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("ab_tests")
      .select("id, test_type, ab_test_variants(id, variant_label, is_control, impressions, conversions, conversion_rate)")
      .eq("funnel_id", funnelId)
      .eq("test_type", "landing_page")
      .maybeSingle(),
  ]);

  const currentEvents = (currentEventsRes.data ?? []) as Array<{
    event_type: string;
    event_data: { amount_cents?: number } | null;
    funnel_stage_id: string | null;
    occurred_at: string;
  }>;
  const previousEvents = (previousEventsRes.data ?? []) as Array<{
    event_type: string;
    event_data: { amount_cents?: number } | null;
    occurred_at: string;
  }>;
  const currentContacts = (currentContactsRes.data ?? []) as Array<{ id: string; created_at: string }>;
  const previousContacts = (previousContactsRes.data ?? []) as Array<{ id: string; created_at: string }>;
  const stages = (stagesRes.data ?? []) as Array<{ id: string; stage_name: string; stage_type: string; stage_order: number }>;
  const currentMetrics = (currentMetricsRes.data ?? []) as Array<{
    ad_creative_id: string;
    impressions: number;
    clicks: number;
    spend_cents: number;
    metric_date: string;
  }>;
  const previousMetrics = (previousMetricsRes.data ?? []) as Array<{ spend_cents: number; metric_date: string }>;
  const ads = (adsRes.data ?? []) as Array<{ id: string; headline: string; status: string }>;
  const sendLog = (sendLogRes.data ?? []) as Array<{
    sequence_step_id: string;
    channel: string;
    status: string;
    sent_at: string;
  }>;
  const emailSteps = (emailStepsRes.data ?? []) as Array<{ id: string; step_order: number; subject: string }>;
  const actions = (actionsRes.data ?? []) as Array<{
    id: string;
    action_type: string;
    diagnosis: string;
    status: string;
    impact_verdict?: string;
    impact_delta?: number;
    risk_tier: string;
    created_at: string;
  }>;
  const abTest = abTestsRes.data as {
    id: string;
    test_type: string;
    ab_test_variants: Array<{
      id: string;
      variant_label: string;
      is_control: boolean;
      impressions: number;
      conversions: number;
      conversion_rate: number;
    }>;
  } | null;

  // ─── KPIs ────────────────────────────────────────────────────────────
  const revenueCents = currentEvents
    .filter((e) => e.event_type === "closed_won")
    .reduce((sum, e) => sum + (e.event_data?.amount_cents ?? 0), 0);
  const previousRevenueCents = previousEvents
    .filter((e) => e.event_type === "closed_won")
    .reduce((sum, e) => sum + (e.event_data?.amount_cents ?? 0), 0);

  const leads = currentContacts.length;
  const previousLeads = previousContacts.length;

  const adSpendCents = currentMetrics.reduce((s, m) => s + (m.spend_cents ?? 0), 0);
  const previousAdSpendCents = previousMetrics.reduce((s, m) => s + (m.spend_cents ?? 0), 0);

  const conversions = currentEvents.filter((e) => e.event_type === "closed_won").length;
  const previousConversions = previousEvents.filter((e) => e.event_type === "closed_won").length;

  const roas = adSpendCents > 0 ? revenueCents / adSpendCents : null;
  const previousRoas = previousAdSpendCents > 0 ? previousRevenueCents / previousAdSpendCents : null;

  const conversionRate = leads > 0 ? conversions / leads : null;
  const previousConversionRate = previousLeads > 0 ? previousConversions / previousLeads : null;

  // ─── Time series ──────────────────────────────────────────────────────
  const revenueTs = groupByDay(
    currentEvents.filter((e) => e.event_type === "closed_won"),
    (r) => r.occurred_at,
    (r) => r.event_data?.amount_cents ?? 0
  ).map(({ date, value }) => ({ date, revenue_cents: value }));

  const leadsTs = groupByDay(
    currentContacts,
    (r) => r.created_at,
    () => 1
  ).map(({ date, value }) => ({ date, leads: value }));

  // ─── Stage conversion ────────────────────────────────────────────────
  const stageEventCounts: Record<string, number> = {};
  for (const e of currentEvents) {
    if (e.funnel_stage_id) {
      stageEventCounts[e.funnel_stage_id] = (stageEventCounts[e.funnel_stage_id] ?? 0) + 1;
    }
  }
  const stageConv = stages.map((s, idx) => {
    const count = stageEventCounts[s.id] ?? 0;
    const prev = idx > 0 ? stageEventCounts[stages[idx - 1].id] ?? 0 : null;
    const rate = prev && prev > 0 ? count / prev : null;
    return {
      stage_name: s.stage_name,
      stage_order: s.stage_order,
      count,
      rate_from_previous: rate,
    };
  });

  // ─── Top ads ──────────────────────────────────────────────────────────
  const adStats: Record<string, { impressions: number; clicks: number; spend_cents: number }> = {};
  for (const m of currentMetrics) {
    if (!adStats[m.ad_creative_id]) {
      adStats[m.ad_creative_id] = { impressions: 0, clicks: 0, spend_cents: 0 };
    }
    adStats[m.ad_creative_id].impressions += m.impressions ?? 0;
    adStats[m.ad_creative_id].clicks += m.clicks ?? 0;
    adStats[m.ad_creative_id].spend_cents += m.spend_cents ?? 0;
  }
  const topAds = ads
    .map((ad) => {
      const s = adStats[ad.id] ?? { impressions: 0, clicks: 0, spend_cents: 0 };
      return {
        id: ad.id,
        headline: ad.headline,
        impressions: s.impressions,
        clicks: s.clicks,
        ctr: s.impressions > 0 ? s.clicks / s.impressions : 0,
        spend_cents: s.spend_cents,
        status: ad.status,
      };
    })
    .sort((a, b) => b.ctr - a.ctr);

  // ─── Email performance ────────────────────────────────────────────────
  const emailStats: Record<string, { sent: number; opened: number; clicked: number }> = {};
  for (const l of sendLog) {
    if (l.channel !== "email") continue;
    if (!emailStats[l.sequence_step_id]) {
      emailStats[l.sequence_step_id] = { sent: 0, opened: 0, clicked: 0 };
    }
    emailStats[l.sequence_step_id].sent++;
    if (l.status === "opened") emailStats[l.sequence_step_id].opened++;
    if (l.status === "clicked") emailStats[l.sequence_step_id].clicked++;
  }
  const emailPerf = emailSteps
    .map((s) => {
      const stat = emailStats[s.id] ?? { sent: 0, opened: 0, clicked: 0 };
      return {
        step_order: s.step_order,
        subject: s.subject,
        sent: stat.sent,
        open_rate: stat.sent > 0 ? stat.opened / stat.sent : 0,
        click_rate: stat.sent > 0 ? stat.clicked / stat.sent : 0,
      };
    })
    .sort((a, b) => a.step_order - b.step_order);

  // ─── Variant comparison ───────────────────────────────────────────────
  const variantComp = (abTest?.ab_test_variants ?? []).map((v) => ({
    variant_label: v.variant_label,
    impressions: v.impressions ?? 0,
    conversions: v.conversions ?? 0,
    conversion_rate: v.conversion_rate ?? 0,
    is_control: v.is_control,
  }));

  return {
    kpis: {
      revenue_cents: revenueCents,
      revenue_delta_pct: pctDelta(revenueCents, previousRevenueCents),
      leads,
      leads_delta_pct: pctDelta(leads, previousLeads),
      ad_spend_cents: adSpendCents,
      ad_spend_delta_pct: pctDelta(adSpendCents, previousAdSpendCents),
      roas,
      roas_delta: roas !== null && previousRoas !== null ? roas - previousRoas : null,
      conversion_rate: conversionRate,
      conversion_rate_delta:
        conversionRate !== null && previousConversionRate !== null
          ? conversionRate - previousConversionRate
          : null,
    },
    revenue_timeseries: revenueTs,
    leads_timeseries: leadsTs,
    stage_conversion: stageConv,
    top_ads: topAds,
    email_performance: emailPerf,
    recent_activity: actions,
    variant_comparison: variantComp,
    funnel_id: funnelId,
    timeframe,
    period_start: start.toISOString(),
    period_end: end.toISOString(),
  };
}

function emptyDashboard(tf: Timeframe, start: Date, end: Date): CampaignDashboardData {
  return {
    kpis: {
      revenue_cents: 0,
      revenue_delta_pct: null,
      leads: 0,
      leads_delta_pct: null,
      ad_spend_cents: 0,
      ad_spend_delta_pct: null,
      roas: null,
      roas_delta: null,
      conversion_rate: null,
      conversion_rate_delta: null,
    },
    revenue_timeseries: [],
    leads_timeseries: [],
    stage_conversion: [],
    top_ads: [],
    email_performance: [],
    recent_activity: [],
    variant_comparison: [],
    funnel_id: null,
    timeframe: tf,
    period_start: start.toISOString(),
    period_end: end.toISOString(),
  };
}

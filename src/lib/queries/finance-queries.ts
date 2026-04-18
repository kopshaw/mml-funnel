import { createAdminClient } from "@/lib/supabase/admin";

export interface ClientFinanceSummary {
  id: string;
  name: string;
  slug: string;
  tier: string;
  ai_budget_cents_monthly: number | null;
  cost_7d_cents: number;
  cost_30d_cents: number;
  revenue_7d_cents: number;
  revenue_30d_cents: number;
  margin_30d_cents: number;
  projected_monthly_cost_cents: number;
  active_overrides: number;
  unacknowledged_insights: number;
  latest_insight: {
    id: string;
    insight_type: string;
    severity: string;
    title: string;
    observed_at: string;
  } | null;
}

export interface CfoInsightRow {
  id: string;
  client_id: string | null;
  client_name: string | null;
  insight_type: string;
  severity: string;
  title: string;
  description: string;
  current_value_cents: number | null;
  threshold_cents: number | null;
  action_taken: string | null;
  observed_at: string;
  acknowledged_at: string | null;
  metrics_snapshot: Record<string, unknown>;
}

export interface ModelPolicyRow {
  id: string;
  client_id: string | null;
  client_name: string | null;
  task_type: string | null;
  model_key: string;
  kind: string;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface FinanceDashboardData {
  totals: {
    total_cost_7d_cents: number;
    total_cost_30d_cents: number;
    total_revenue_7d_cents: number;
    total_revenue_30d_cents: number;
    total_margin_30d_cents: number;
    active_clients: number;
    active_overrides: number;
  };
  clients: ClientFinanceSummary[];
  recent_insights: CfoInsightRow[];
  active_overrides: ModelPolicyRow[];
  cost_by_provider_30d: { provider: string; cost_cents: number }[];
  cost_timeseries_30d: { date: string; cost_cents: number }[];
}

export async function getFinanceDashboard(): Promise<FinanceDashboardData> {
  const supabase = createAdminClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    clientsRes,
    usage30dRes,
    eventsRes,
    insightsRes,
    overridesRes,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, slug, tier, ai_budget_cents_monthly, status")
      .eq("status", "active"),
    supabase
      .from("integration_usage")
      .select("client_id, integration_type, cost_cents, occurred_at")
      .gte("occurred_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("pipeline_events")
      .select("event_data, occurred_at, funnel_id, event_type")
      .eq("event_type", "closed_won")
      .gte("occurred_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("cfo_insights")
      .select("id, client_id, insight_type, severity, title, description, current_value_cents, threshold_cents, action_taken, observed_at, acknowledged_at, metrics_snapshot")
      .order("observed_at", { ascending: false })
      .limit(50),
    supabase
      .from("model_policy_overrides")
      .select("id, client_id, task_type, model_key, kind, reason, expires_at, created_at")
      .eq("active", true),
  ]);

  const clients = (clientsRes.data ?? []) as Array<{
    id: string;
    name: string;
    slug: string;
    tier: string;
    ai_budget_cents_monthly: number | null;
  }>;
  const usage = (usage30dRes.data ?? []) as Array<{
    client_id: string | null;
    integration_type: string;
    cost_cents: number | null;
    occurred_at: string;
  }>;
  const events = (eventsRes.data ?? []) as Array<{
    event_data: { amount_cents?: number } | null;
    funnel_id: string | null;
    occurred_at: string;
  }>;
  const insights = (insightsRes.data ?? []) as CfoInsightRow[];
  const overrides = (overridesRes.data ?? []) as ModelPolicyRow[];

  // Map funnel_id → client_id
  const { data: funnels } = await supabase
    .from("funnels")
    .select("id, client_id");
  const funnelClient: Record<string, string | null> = {};
  for (const f of funnels ?? []) {
    funnelClient[f.id as string] = f.client_id as string | null;
  }

  const clientNameById: Record<string, string> = {};
  for (const c of clients) clientNameById[c.id] = c.name;

  // Aggregate per client
  const perClient: Record<
    string,
    {
      cost_7d: number;
      cost_30d: number;
      revenue_7d: number;
      revenue_30d: number;
    }
  > = {};
  for (const c of clients) {
    perClient[c.id] = { cost_7d: 0, cost_30d: 0, revenue_7d: 0, revenue_30d: 0 };
  }

  for (const u of usage) {
    if (!u.client_id) continue;
    const bucket = perClient[u.client_id];
    if (!bucket) continue;
    const c = u.cost_cents ?? 0;
    bucket.cost_30d += c;
    if (u.occurred_at >= sevenDaysAgo.toISOString()) bucket.cost_7d += c;
  }

  for (const e of events) {
    if (!e.funnel_id) continue;
    const clientId = funnelClient[e.funnel_id];
    if (!clientId) continue;
    const bucket = perClient[clientId];
    if (!bucket) continue;
    const cents = e.event_data?.amount_cents ?? 0;
    bucket.revenue_30d += cents;
    if (e.occurred_at >= sevenDaysAgo.toISOString()) bucket.revenue_7d += cents;
  }

  // Per-client override counts + unacknowledged insight counts
  const overridesByClient: Record<string, number> = {};
  for (const o of overrides) {
    if (!o.client_id) continue;
    overridesByClient[o.client_id] = (overridesByClient[o.client_id] ?? 0) + 1;
  }
  const unackByClient: Record<string, number> = {};
  for (const i of insights) {
    if (!i.client_id || i.acknowledged_at) continue;
    unackByClient[i.client_id] = (unackByClient[i.client_id] ?? 0) + 1;
  }
  const latestInsightByClient: Record<string, CfoInsightRow> = {};
  for (const i of insights) {
    if (!i.client_id) continue;
    if (!latestInsightByClient[i.client_id]) latestInsightByClient[i.client_id] = i;
  }

  // Build per-client summaries
  const clientSummaries: ClientFinanceSummary[] = clients.map((c) => {
    const b = perClient[c.id] ?? { cost_7d: 0, cost_30d: 0, revenue_7d: 0, revenue_30d: 0 };
    const li = latestInsightByClient[c.id];
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      tier: c.tier,
      ai_budget_cents_monthly: c.ai_budget_cents_monthly,
      cost_7d_cents: b.cost_7d,
      cost_30d_cents: b.cost_30d,
      revenue_7d_cents: b.revenue_7d,
      revenue_30d_cents: b.revenue_30d,
      margin_30d_cents: b.revenue_30d - b.cost_30d,
      projected_monthly_cost_cents: Math.round(b.cost_7d * (30 / 7)),
      active_overrides: overridesByClient[c.id] ?? 0,
      unacknowledged_insights: unackByClient[c.id] ?? 0,
      latest_insight: li
        ? {
            id: li.id,
            insight_type: li.insight_type,
            severity: li.severity,
            title: li.title,
            observed_at: li.observed_at,
          }
        : null,
    };
  });

  // Totals
  const total_cost_7d_cents = usage
    .filter((u) => u.occurred_at >= sevenDaysAgo.toISOString())
    .reduce((s, u) => s + (u.cost_cents ?? 0), 0);
  const total_cost_30d_cents = usage.reduce((s, u) => s + (u.cost_cents ?? 0), 0);
  const total_revenue_7d_cents = events
    .filter((e) => e.occurred_at >= sevenDaysAgo.toISOString())
    .reduce((s, e) => s + (e.event_data?.amount_cents ?? 0), 0);
  const total_revenue_30d_cents = events.reduce(
    (s, e) => s + (e.event_data?.amount_cents ?? 0),
    0
  );

  // Cost by provider (30d)
  const byProvider: Record<string, number> = {};
  for (const u of usage) {
    byProvider[u.integration_type] = (byProvider[u.integration_type] ?? 0) + (u.cost_cents ?? 0);
  }
  const costByProvider = Object.entries(byProvider)
    .map(([provider, cost_cents]) => ({ provider, cost_cents }))
    .sort((a, b) => b.cost_cents - a.cost_cents);

  // Cost time series
  const byDay: Record<string, number> = {};
  for (const u of usage) {
    const day = u.occurred_at.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + (u.cost_cents ?? 0);
  }
  const costTimeseries = Object.entries(byDay)
    .map(([date, cost_cents]) => ({ date, cost_cents }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Decorate insights + overrides with client names
  const recentInsights = insights.slice(0, 25).map((i) => ({
    ...i,
    client_name: i.client_id ? clientNameById[i.client_id] ?? null : null,
  }));
  const decoratedOverrides = overrides.map((o) => ({
    ...o,
    client_name: o.client_id ? clientNameById[o.client_id] ?? null : null,
  }));

  return {
    totals: {
      total_cost_7d_cents,
      total_cost_30d_cents,
      total_revenue_7d_cents,
      total_revenue_30d_cents,
      total_margin_30d_cents: total_revenue_30d_cents - total_cost_30d_cents,
      active_clients: clients.length,
      active_overrides: overrides.length,
    },
    clients: clientSummaries,
    recent_insights: recentInsights,
    active_overrides: decoratedOverrides,
    cost_by_provider_30d: costByProvider,
    cost_timeseries_30d: costTimeseries,
  };
}

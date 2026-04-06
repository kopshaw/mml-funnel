import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Overview / dashboard KPIs
// ---------------------------------------------------------------------------

export async function getOverviewKPIs(clientId?: string) {
  const supabase = createAdminClient();

  // --- Total revenue (sum of closed_won event_data.amount_cents) ----------
  // pipeline_events has no client_id — filter via funnels that belong to this client.
  let revenueEventsQuery = supabase
    .from("pipeline_events")
    .select("event_data, funnel_id")
    .eq("event_type", "closed_won");

  if (clientId) {
    // Get funnel IDs for this client first, then filter events
    const { data: clientFunnels } = await supabase
      .from("funnels")
      .select("id")
      .eq("client_id", clientId);

    const funnelIds = (clientFunnels ?? []).map((f: any) => f.id);

    if (funnelIds.length > 0) {
      revenueEventsQuery = revenueEventsQuery.in("funnel_id", funnelIds);
    } else {
      // No funnels for this client — short-circuit with zeroes
      return {
        totalRevenue: 0,
        adSpend: 0,
        totalLeads: 0,
        activeFunnels: 0,
        conversions: 0,
      };
    }
  }

  const { data: revenueEvents } = await revenueEventsQuery;
  const totalRevenue = (revenueEvents ?? []).reduce((sum: number, e: any) => {
    const cents = e.event_data?.amount_cents ?? 0;
    return sum + Number(cents);
  }, 0);

  // --- Ad spend (sum from ad_metrics.spend_cents) -------------------------
  let spendQuery = supabase.from("ad_metrics").select("spend_cents");

  if (clientId) {
    spendQuery = spendQuery.eq("client_id", clientId);
  }

  const { data: spendRows } = await spendQuery;
  const adSpend = (spendRows ?? []).reduce(
    (sum: number, r: any) => sum + Number(r.spend_cents ?? 0),
    0
  );

  // --- Total leads (count of contacts) ------------------------------------
  let leadsQuery = supabase
    .from("contacts")
    .select("id", { count: "exact", head: true });

  if (clientId) {
    leadsQuery = leadsQuery.eq("client_id", clientId);
  }

  const { count: totalLeads } = await leadsQuery;

  // --- Active funnels (count of active funnels) ---------------------------
  let funnelsQuery = supabase
    .from("funnels")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if (clientId) {
    funnelsQuery = funnelsQuery.eq("client_id", clientId);
  }

  const { count: activeFunnels } = await funnelsQuery;

  // --- Conversions (count of closed_won events) ---------------------------
  const conversions = (revenueEvents ?? []).length;

  return {
    totalRevenue,
    adSpend,
    totalLeads: totalLeads ?? 0,
    activeFunnels: activeFunnels ?? 0,
    conversions,
  };
}

// ---------------------------------------------------------------------------
// Revenue time-series (daily, last N days)
// ---------------------------------------------------------------------------

export async function getRevenueTimeSeries(clientId?: string, days = 30) {
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  let query = supabase
    .from("pipeline_events")
    .select("event_data, occurred_at, funnel_id")
    .eq("event_type", "closed_won")
    .gte("occurred_at", since.toISOString())
    .order("occurred_at", { ascending: true });

  if (clientId) {
    const { data: clientFunnels } = await supabase
      .from("funnels")
      .select("id")
      .eq("client_id", clientId);

    const funnelIds = (clientFunnels ?? []).map((f: any) => f.id);
    if (funnelIds.length > 0) {
      query = query.in("funnel_id", funnelIds);
    } else {
      return [];
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("getRevenueTimeSeries error:", error.message);
    return [];
  }

  // Group by date
  const grouped: Record<string, number> = {};
  for (const row of data ?? []) {
    const date = (row.occurred_at as string).slice(0, 10); // YYYY-MM-DD
    const cents = Number(row.event_data?.amount_cents ?? 0);
    grouped[date] = (grouped[date] ?? 0) + cents;
  }

  return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
}

// ---------------------------------------------------------------------------
// Pipeline distribution (contacts by qualification_status)
// ---------------------------------------------------------------------------

export async function getPipelineDistribution(clientId?: string) {
  const supabase = createAdminClient();

  let query = supabase.from("contacts").select("qualification_status");

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getPipelineDistribution error:", error.message);
    return [];
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const status = (row.qualification_status as string) ?? "unknown";
    counts[status] = (counts[status] ?? 0) + 1;
  }

  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}

// ---------------------------------------------------------------------------
// Recent activity — union of optimization_actions + alerts
// ---------------------------------------------------------------------------

export async function getRecentActivity(clientId?: string, limit = 10) {
  const supabase = createAdminClient();

  // --- Optimization actions -----------------------------------------------
  let actionsQuery = supabase
    .from("optimization_actions")
    .select("id, action_type, diagnosis, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (clientId) {
    actionsQuery = actionsQuery.eq("client_id", clientId);
  }

  const { data: actions } = await actionsQuery;

  // --- Alerts -------------------------------------------------------------
  let alertsQuery = supabase
    .from("alerts")
    .select("id, severity, title, message, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (clientId) {
    alertsQuery = alertsQuery.eq("client_id", clientId);
  }

  const { data: alerts } = await alertsQuery;

  // Merge, tag, sort, and trim
  const merged = [
    ...(actions ?? []).map((a: any) => ({ ...a, _type: "action" as const })),
    ...(alerts ?? []).map((a: any) => ({ ...a, _type: "alert" as const })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return merged.slice(0, limit);
}

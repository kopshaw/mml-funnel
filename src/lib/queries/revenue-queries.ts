import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Revenue KPIs
// ---------------------------------------------------------------------------

export async function getRevenueKPIs(clientId?: string) {
  const supabase = createAdminClient();

  // --- Closed-won events --------------------------------------------------
  let eventsQuery = supabase
    .from("pipeline_events")
    .select("event_data, funnel_id")
    .eq("event_type", "closed_won");

  // --- Ad spend for CAC calc ----------------------------------------------
  let spendQuery = supabase.from("ad_metrics").select("spend_cents");

  if (clientId) {
    const { data: clientFunnels } = await supabase
      .from("funnels")
      .select("id")
      .eq("client_id", clientId);

    const funnelIds = (clientFunnels ?? []).map((f: any) => f.id);

    if (funnelIds.length > 0) {
      eventsQuery = eventsQuery.in("funnel_id", funnelIds);
    } else {
      return {
        totalRevenue: 0,
        avgDealSize: 0,
        dealCount: 0,
        estimatedCAC: 0,
      };
    }

    spendQuery = spendQuery.eq("client_id", clientId);
  }

  const { data: events } = await eventsQuery;
  const { data: spendRows } = await spendQuery;

  const deals = events ?? [];
  const dealCount = deals.length;
  const totalRevenue = deals.reduce((sum: number, e: any) => {
    return sum + Number(e.event_data?.amount_cents ?? 0);
  }, 0);

  const avgDealSize = dealCount > 0 ? Math.round(totalRevenue / dealCount) : 0;

  const totalSpend = (spendRows ?? []).reduce(
    (sum: number, r: any) => sum + Number(r.spend_cents ?? 0),
    0
  );

  const estimatedCAC = dealCount > 0 ? Math.round(totalSpend / dealCount) : 0;

  return {
    totalRevenue,
    avgDealSize,
    dealCount,
    estimatedCAC,
  };
}

// ---------------------------------------------------------------------------
// Revenue by funnel
// ---------------------------------------------------------------------------

export async function getRevenueByFunnel(clientId?: string) {
  const supabase = createAdminClient();

  // Fetch closed_won events with funnel_id
  let eventsQuery = supabase
    .from("pipeline_events")
    .select("event_data, funnel_id")
    .eq("event_type", "closed_won");

  if (clientId) {
    const { data: clientFunnels } = await supabase
      .from("funnels")
      .select("id")
      .eq("client_id", clientId);

    const funnelIds = (clientFunnels ?? []).map((f: any) => f.id);
    if (funnelIds.length > 0) {
      eventsQuery = eventsQuery.in("funnel_id", funnelIds);
    } else {
      return [];
    }
  }

  const { data: events, error: eventsError } = await eventsQuery;

  if (eventsError) {
    console.error("getRevenueByFunnel events error:", eventsError.message);
    return [];
  }

  // Group revenue by funnel_id
  const revenueByFunnelId: Record<string, number> = {};
  for (const e of events ?? []) {
    const fid = e.funnel_id as string;
    if (!fid) continue;
    revenueByFunnelId[fid] =
      (revenueByFunnelId[fid] ?? 0) + Number(e.event_data?.amount_cents ?? 0);
  }

  if (Object.keys(revenueByFunnelId).length === 0) {
    return [];
  }

  // Fetch funnel names
  const { data: funnels } = await supabase
    .from("funnels")
    .select("id, name")
    .in("id", Object.keys(revenueByFunnelId));

  const funnelNameMap: Record<string, string> = {};
  for (const f of funnels ?? []) {
    funnelNameMap[f.id] = f.name;
  }

  return Object.entries(revenueByFunnelId).map(([funnelId, revenue]) => ({
    funnelId,
    funnelName: funnelNameMap[funnelId] ?? "Unknown",
    revenue,
  }));
}

// ---------------------------------------------------------------------------
// Closed deals (pipeline_events joined with contacts)
// ---------------------------------------------------------------------------

export async function getClosedDeals(clientId?: string, limit = 20) {
  const supabase = createAdminClient();

  let eventsQuery = supabase
    .from("pipeline_events")
    .select("id, event_data, occurred_at, contact_id, funnel_id")
    .eq("event_type", "closed_won")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (clientId) {
    const { data: clientFunnels } = await supabase
      .from("funnels")
      .select("id")
      .eq("client_id", clientId);

    const funnelIds = (clientFunnels ?? []).map((f: any) => f.id);
    if (funnelIds.length > 0) {
      eventsQuery = eventsQuery.in("funnel_id", funnelIds);
    } else {
      return [];
    }
  }

  const { data: events, error } = await eventsQuery;

  if (error) {
    console.error("getClosedDeals error:", error.message);
    return [];
  }

  if (!events || events.length === 0) return [];

  // Fetch contact details for each deal
  const contactIds = [...new Set(events.map((e: any) => e.contact_id))];

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email")
    .in("id", contactIds);

  const contactMap: Record<
    string,
    { first_name: string; last_name: string; email: string }
  > = {};
  for (const c of contacts ?? []) {
    contactMap[c.id] = {
      first_name: c.first_name ?? "",
      last_name: c.last_name ?? "",
      email: c.email ?? "",
    };
  }

  return events.map((e: any) => ({
    id: e.id,
    amount_cents: Number(e.event_data?.amount_cents ?? 0),
    occurred_at: e.occurred_at,
    contact: contactMap[e.contact_id] ?? {
      first_name: "",
      last_name: "",
      email: "",
    },
  }));
}

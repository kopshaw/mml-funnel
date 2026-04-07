import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Alerts list with optional filters
// ---------------------------------------------------------------------------

export async function getAlerts(
  clientId?: string,
  severity?: string,
  limit = 50
) {
  const supabase = createAdminClient();

  let query = supabase
    .from("alerts")
    .select(
      "id, funnel_id, optimization_action_id, severity, title, message, acknowledged, acknowledged_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (severity) {
    query = query.eq("severity", severity);
  }

  if (clientId) {
    // Filter via funnel_id -> funnels.client_id
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

  const { data: alerts, error } = await query;

  if (error) {
    console.error("getAlerts error:", error.message);
    return [];
  }

  if (!alerts || alerts.length === 0) return [];

  // Fetch funnel names
  const funnelIds = [...new Set(alerts.map((a: any) => a.funnel_id))];

  const { data: funnels } = await supabase
    .from("funnels")
    .select("id, name")
    .in("id", funnelIds);

  const funnelNameMap: Record<string, string> = {};
  for (const f of funnels ?? []) {
    funnelNameMap[f.id] = f.name;
  }

  return alerts.map((a: any) => ({
    ...a,
    funnel_name: funnelNameMap[a.funnel_id] ?? "Unknown Funnel",
  }));
}

// ---------------------------------------------------------------------------
// Alert counts by severity
// ---------------------------------------------------------------------------

export async function getAlertCounts(clientId?: string) {
  const supabase = createAdminClient();

  let query = supabase
    .from("alerts")
    .select("severity, funnel_id")
    .eq("acknowledged", false);

  if (clientId) {
    const { data: clientFunnels } = await supabase
      .from("funnels")
      .select("id")
      .eq("client_id", clientId);

    const funnelIds = (clientFunnels ?? []).map((f: any) => f.id);

    if (funnelIds.length > 0) {
      query = query.in("funnel_id", funnelIds);
    } else {
      return { critical: 0, warning: 0, info: 0 };
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAlertCounts error:", error.message);
    return { critical: 0, warning: 0, info: 0 };
  }

  const counts = { critical: 0, warning: 0, info: 0 };
  for (const row of data ?? []) {
    const sev = row.severity as keyof typeof counts;
    if (sev in counts) {
      counts[sev]++;
    }
  }

  return counts;
}

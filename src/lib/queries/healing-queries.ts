import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Optimization actions (self-healing activity feed)
// ---------------------------------------------------------------------------

export async function getOptimizationActions(clientId?: string, limit = 50) {
  const supabase = createAdminClient();

  // optimization_actions may not have client_id directly — filter via funnel_id
  let query = supabase
    .from("optimization_actions")
    .select(
      "id, funnel_id, action_type, title, description, status, priority, ai_reasoning, created_at, deployed_at, completed_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (clientId) {
    // Get funnel IDs for this client
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

  const { data: actions, error } = await query;

  if (error) {
    console.error("getOptimizationActions error:", error.message);
    return [];
  }

  if (!actions || actions.length === 0) return [];

  // Fetch funnel names for display
  const funnelIds = [...new Set(actions.map((a: any) => a.funnel_id))];

  const { data: funnels } = await supabase
    .from("funnels")
    .select("id, name")
    .in("id", funnelIds);

  const funnelNameMap: Record<string, string> = {};
  for (const f of funnels ?? []) {
    funnelNameMap[f.id] = f.name;
  }

  return actions.map((a: any) => ({
    ...a,
    funnel_name: funnelNameMap[a.funnel_id] ?? "Unknown Funnel",
  }));
}

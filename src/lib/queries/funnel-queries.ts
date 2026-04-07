import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Funnel list (with stage count and health)
// ---------------------------------------------------------------------------

export async function getFunnels(clientId?: string) {
  const supabase = createAdminClient();

  let query = supabase
    .from("funnels")
    .select("id, name, landing_page_slug, status, offer_type, offer_price_cents, client_id, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data: funnels, error } = await query;

  if (error) {
    console.error("getFunnels error:", error.message);
    return [];
  }

  if (!funnels || funnels.length === 0) return [];

  // Fetch stage counts for each funnel
  const funnelIds = funnels.map((f: any) => f.id);

  const { data: stages } = await supabase
    .from("funnel_stages")
    .select("funnel_id")
    .in("funnel_id", funnelIds);

  const stageCounts: Record<string, number> = {};
  for (const stage of stages ?? []) {
    const fid = stage.funnel_id as string;
    stageCounts[fid] = (stageCounts[fid] ?? 0) + 1;
  }

  return funnels.map((f: any) => ({
    id: f.id,
    name: f.name,
    slug: f.landing_page_slug,
    status: f.status ?? "draft",
    offer_type: f.offer_type ?? "low_ticket",
    stages: stageCounts[f.id] ?? 0,
    client_id: f.client_id,
    created_at: f.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Single funnel detail with stages and baselines
// ---------------------------------------------------------------------------

export async function getFunnelDetail(id: string) {
  const supabase = createAdminClient();

  const { data: funnel, error } = await supabase
    .from("funnels")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getFunnelDetail error:", error.message);
    return null;
  }

  // Fetch stages for this funnel
  const { data: stages } = await supabase
    .from("funnel_stages")
    .select("*")
    .eq("funnel_id", id)
    .order("stage_order", { ascending: true });

  // Fetch baselines for all stages of this funnel
  const stageIds = (stages ?? []).map((s: any) => s.id);
  let baselines: any[] = [];

  if (stageIds.length > 0) {
    const { data: baselineData } = await supabase
      .from("stage_baselines")
      .select("*")
      .in("funnel_stage_id", stageIds);

    baselines = baselineData ?? [];
  }

  return {
    ...funnel,
    stages: stages ?? [],
    baselines,
  };
}

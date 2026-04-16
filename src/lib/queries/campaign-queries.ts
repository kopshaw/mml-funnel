import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Campaign Briefs — queries for the campaigns page
// ---------------------------------------------------------------------------

export interface CampaignBrief {
  id: string;
  client_id: string | null;
  status: string;
  brand_name: string;
  offer_name: string;
  offer_type: string;
  offer_price_cents: number;
  campaign_goal: string | null;
  traffic_source: string | null;
  daily_budget_cents: number | null;
  created_at: string;
  updated_at: string;
  client?: { name: string } | null;
}

export async function getCampaignBriefs(clientId?: string): Promise<CampaignBrief[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("campaign_briefs")
    .select("id, client_id, status, brand_name, offer_name, offer_type, offer_price_cents, campaign_goal, traffic_source, daily_budget_cents, created_at, updated_at, clients(name)")
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getCampaignBriefs error:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    client: row.clients ?? null,
  }));
}

export async function getCampaignBriefCounts(clientId?: string) {
  const supabase = createAdminClient();

  let query = supabase
    .from("campaign_briefs")
    .select("status");

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getCampaignBriefCounts error:", error.message);
    return { total: 0, draft: 0, generating: 0, review: 0, launched: 0 };
  }

  const rows = data ?? [];
  return {
    total: rows.length,
    draft: rows.filter((r: any) => r.status === "draft").length,
    generating: rows.filter((r: any) => r.status === "generating").length,
    review: rows.filter((r: any) => ["review", "approved"].includes(r.status)).length,
    launched: rows.filter((r: any) => r.status === "launched").length,
  };
}

export async function getCampaignBriefById(id: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("campaign_briefs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getCampaignBriefById error:", error.message);
    return null;
  }

  return data;
}

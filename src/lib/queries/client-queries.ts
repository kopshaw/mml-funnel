import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Client & user-role queries
// ---------------------------------------------------------------------------

export async function getClients() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("getClients error:", error.message);
    return [];
  }
  return data;
}

export async function getClient(id: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getClient error:", error.message);
    return null;
  }
  return data;
}

export async function createClient(data: {
  name: string;
  slug: string;
  logo_url?: string;
  industry?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  status?: string;
}) {
  const supabase = createAdminClient();

  const { data: created, error } = await supabase
    .from("clients")
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error("createClient error:", error.message);
    return null;
  }
  return created;
}

export async function updateClient(
  id: string,
  data: {
    name?: string;
    slug?: string;
    logo_url?: string;
    industry?: string;
    website?: string;
    contact_email?: string;
    contact_phone?: string;
    notes?: string;
    status?: string;
  }
) {
  const supabase = createAdminClient();

  const { data: updated, error } = await supabase
    .from("clients")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updateClient error:", error.message);
    return null;
  }
  return updated;
}

export async function getUserRole(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("client_users")
    .select("role, client_id")
    .eq("user_id", userId);

  if (error) {
    console.error("getUserRole error:", error.message);
    return null;
  }
  return data;
}

export async function getClientBySlug(slug: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("getClientBySlug error:", error.message);
    return null;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Users list (client_users with role info)
// ---------------------------------------------------------------------------

export async function getUsers() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("client_users")
    .select("id, user_id, client_id, role, created_at, clients(id, name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUsers error:", error.message);
    return [];
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Clients with funnel count
// ---------------------------------------------------------------------------

export async function getClientsWithFunnelCount() {
  const supabase = createAdminClient();

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  if (clientsError) {
    console.error("getClientsWithFunnelCount error:", clientsError.message);
    return [];
  }

  if (!clients || clients.length === 0) return [];

  // Count funnels per client
  const { data: funnels } = await supabase
    .from("funnels")
    .select("client_id");

  const funnelCounts: Record<string, number> = {};
  for (const f of funnels ?? []) {
    const cid = f.client_id as string;
    if (cid) {
      funnelCounts[cid] = (funnelCounts[cid] ?? 0) + 1;
    }
  }

  return clients.map((c: any) => ({
    ...c,
    funnel_count: funnelCounts[c.id] ?? 0,
  }));
}

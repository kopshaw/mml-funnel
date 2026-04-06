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

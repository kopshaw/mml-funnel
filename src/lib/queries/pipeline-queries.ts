import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Contact list with search / status filter / pagination
// ---------------------------------------------------------------------------

export async function getContacts(
  clientId?: string,
  options: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const supabase = createAdminClient();
  const { search, status, limit = 50, offset = 0 } = options;

  let query = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  if (status) {
    query = query.eq("qualification_status", status);
  }

  if (search) {
    // ilike search across first_name, last_name, and email
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("getContacts error:", error.message);
    return { data: [], count: 0 };
  }

  return { data: data ?? [], count: count ?? 0 };
}

// ---------------------------------------------------------------------------
// Stage distribution (contacts grouped by qualification_status)
// ---------------------------------------------------------------------------

export async function getStageDistribution(clientId?: string) {
  const supabase = createAdminClient();

  let query = supabase.from("contacts").select("qualification_status");

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getStageDistribution error:", error.message);
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
// Lead score distribution (buckets: 0-20, 21-40, 41-60, 61-80, 81-100)
// ---------------------------------------------------------------------------

export async function getLeadScoreDistribution(clientId?: string) {
  const supabase = createAdminClient();

  let query = supabase.from("contacts").select("lead_score");

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getLeadScoreDistribution error:", error.message);
    return [];
  }

  const buckets = [
    { label: "0-20", min: 0, max: 20, count: 0 },
    { label: "21-40", min: 21, max: 40, count: 0 },
    { label: "41-60", min: 41, max: 60, count: 0 },
    { label: "61-80", min: 61, max: 80, count: 0 },
    { label: "81-100", min: 81, max: 100, count: 0 },
  ];

  for (const row of data ?? []) {
    const score = Number(row.lead_score ?? 0);
    for (const bucket of buckets) {
      if (score >= bucket.min && score <= bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  return buckets.map(({ label, count }) => ({ label, count }));
}

// ---------------------------------------------------------------------------
// Single contact detail
// ---------------------------------------------------------------------------

export async function getContactDetail(contactId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (error) {
    console.error("getContactDetail error:", error.message);
    return null;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Contact timeline (pipeline_events for a contact)
// ---------------------------------------------------------------------------

export async function getContactTimeline(contactId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("pipeline_events")
    .select("*")
    .eq("contact_id", contactId)
    .order("occurred_at", { ascending: false });

  if (error) {
    console.error("getContactTimeline error:", error.message);
    return [];
  }
  return data ?? [];
}

import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Conversation list with filters and pagination
// ---------------------------------------------------------------------------

export async function getConversations(
  clientId?: string,
  options: {
    status?: string;
    channel?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const supabase = createAdminClient();
  const { status, channel, limit = 50, offset = 0 } = options;

  // Join with contacts for name display
  let query = supabase
    .from("conversations")
    .select(
      "id, contact_id, funnel_id, channel, conversation_type, status, message_count, last_message_at, created_at, contacts(id, first_name, last_name, email)",
      { count: "exact" }
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("getConversations error:", error.message);
    return { data: [], count: 0 };
  }

  return { data: data ?? [], count: count ?? 0 };
}

// ---------------------------------------------------------------------------
// Single conversation detail
// ---------------------------------------------------------------------------

export async function getConversationDetail(conversationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("conversations")
    .select(
      "*, contacts(id, first_name, last_name, email, phone, qualification_status, lead_score)"
    )
    .eq("id", conversationId)
    .single();

  if (error) {
    console.error("getConversationDetail error:", error.message);
    return null;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Conversation stats (aggregates)
// ---------------------------------------------------------------------------

export async function getConversationStats(clientId?: string) {
  const supabase = createAdminClient();

  let query = supabase
    .from("conversations")
    .select("id, status, message_count");

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getConversationStats error:", error.message);
    return {
      total: 0,
      qualified: 0,
      booked: 0,
      avgMessageCount: 0,
    };
  }

  const rows = data ?? [];
  const total = rows.length;

  const qualified = rows.filter(
    (r: any) => r.status === "qualified"
  ).length;

  const booked = rows.filter(
    (r: any) => r.status === "booked"
  ).length;

  const totalMessages = rows.reduce(
    (sum: number, r: any) => sum + Number(r.message_count ?? 0),
    0
  );
  const avgMessageCount = total > 0 ? Math.round(totalMessages / total) : 0;

  return {
    total,
    qualified,
    booked,
    avgMessageCount,
  };
}

// ---------------------------------------------------------------------------
// Qualification funnel (counts at each conversation status stage)
// ---------------------------------------------------------------------------

export async function getQualificationFunnel(clientId?: string) {
  const supabase = createAdminClient();

  let query = supabase.from("conversations").select("status");

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getQualificationFunnel error:", error.message);
    return [];
  }

  // Ordered stages matching the conversations.status CHECK constraint
  const stageOrder = [
    "active",
    "qualified",
    "disqualified",
    "booked",
    "escalated",
    "closed",
  ];

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const s = (row.status as string) ?? "active";
    counts[s] = (counts[s] ?? 0) + 1;
  }

  return stageOrder.map((stage) => ({
    stage,
    count: counts[stage] ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Conversation messages (JSONB field on conversations table)
// ---------------------------------------------------------------------------

export async function getConversationMessages(conversationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("messages")
    .eq("id", conversationId)
    .single();

  if (error) {
    console.error("getConversationMessages error:", error.message);
    return [];
  }

  // messages is a JSONB array on the conversations table
  return (data?.messages as any[]) ?? [];
}

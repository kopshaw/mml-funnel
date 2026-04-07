import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  // Fetch all client_users with their client info
  const { data: clientUsers, error } = await supabase
    .from("client_users")
    .select("id, user_id, role, created_at, clients(id, name, slug)")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch auth user details via admin API
  const { data: authData } = await supabase.auth.admin.listUsers();
  const authUsers = authData?.users ?? [];

  // Build a map of user_id -> auth info
  const authMap = new Map(
    authUsers.map((u) => [
      u.id,
      {
        email: u.email,
        full_name: u.user_metadata?.full_name,
        last_sign_in_at: u.last_sign_in_at,
        created_at: u.created_at,
      },
    ])
  );

  // Group client_users by user_id
  const userMap = new Map<
    string,
    {
      id: string;
      email: string;
      full_name: string | null;
      last_sign_in_at: string | null;
      auth_created_at: string | null;
      assignments: {
        id: string;
        role: string;
        client_id: string;
        client_name: string;
        client_slug: string;
      }[];
    }
  >();

  for (const cu of clientUsers ?? []) {
    const auth = authMap.get(cu.user_id);
    const client = cu.clients as unknown as {
      id: string;
      name: string;
      slug: string;
    } | null;

    if (!userMap.has(cu.user_id)) {
      userMap.set(cu.user_id, {
        id: cu.user_id,
        email: auth?.email ?? "Unknown",
        full_name: auth?.full_name ?? null,
        last_sign_in_at: auth?.last_sign_in_at ?? null,
        auth_created_at: auth?.created_at ?? null,
        assignments: [],
      });
    }

    userMap.get(cu.user_id)!.assignments.push({
      id: cu.id,
      role: cu.role,
      client_id: client?.id ?? "",
      client_name: client?.name ?? "Unknown",
      client_slug: client?.slug ?? "",
    });
  }

  return NextResponse.json(Array.from(userMap.values()));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, full_name, role, client_id, password } = body;

  if (!email || !client_id) {
    return NextResponse.json(
      { error: "Email and client_id are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Check if user already exists in auth
  const { data: authData } = await supabase.auth.admin.listUsers();
  const existingUser = authData?.users?.find((u) => u.email === email);

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // Create new auth user
    const { data: newUser, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: password || undefined,
        email_confirm: true,
        user_metadata: { full_name: full_name || email.split("@")[0] },
      });

    if (authError)
      return NextResponse.json({ error: authError.message }, { status: 500 });

    userId = newUser.user.id;
  }

  // Check if user already assigned to this client
  const { data: existing } = await supabase
    .from("client_users")
    .select("id")
    .eq("user_id", userId)
    .eq("client_id", client_id)
    .maybeSingle();

  if (existing) {
    // Update role
    const { error: updateErr } = await supabase
      .from("client_users")
      .update({ role: role || "client_viewer" })
      .eq("id", existing.id);

    if (updateErr)
      return NextResponse.json(
        { error: updateErr.message },
        { status: 500 }
      );

    return NextResponse.json({ message: "User role updated", userId });
  }

  // Assign user to client
  const { error: insertErr } = await supabase.from("client_users").insert({
    user_id: userId,
    client_id,
    role: role || "client_viewer",
  });

  if (insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json(
    { message: "User invited and assigned", userId },
    { status: 201 }
  );
}

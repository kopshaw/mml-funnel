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

  // Collect unique user_ids and fetch auth details individually
  // (listUsers fails due to GoTrue schema bug with legacy NULL columns)
  const uniqueUserIds = [
    ...new Set((clientUsers ?? []).map((cu) => cu.user_id)),
  ];

  const authMap = new Map<
    string,
    {
      email: string | undefined;
      full_name: string | undefined;
      last_sign_in_at: string | undefined;
      created_at: string | undefined;
    }
  >();

  await Promise.all(
    uniqueUserIds.map(async (uid) => {
      try {
        const { data } = await supabase.auth.admin.getUserById(uid);
        if (data?.user) {
          authMap.set(uid, {
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name,
            last_sign_in_at: data.user.last_sign_in_at,
            created_at: data.user.created_at,
          });
        }
      } catch {
        // Skip users with broken auth records
      }
    })
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let userId: string | null = null;

  // Try to create user via signup (avoids broken listUsers API)
  const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password: password || "temp-" + crypto.randomUUID().slice(0, 12),
      options: {
        data: { full_name: full_name || email.split("@")[0] },
      },
    }),
  });

  const signupData = await signupRes.json();

  if (signupRes.ok && signupData.id) {
    // New user created via signup — confirm email via admin API
    userId = signupData.id;
    await supabase.auth.admin.updateUserById(userId!, {
      email_confirm: true,
    });
  } else {
    // User may already exist — check client_users for a matching user_id
    // by trying to load each known user and matching email
    const { data: allCu } = await supabase
      .from("client_users")
      .select("user_id");
    const uids = [...new Set((allCu ?? []).map((c) => c.user_id))];

    for (const uid of uids) {
      try {
        const { data } = await supabase.auth.admin.getUserById(uid);
        if (data?.user?.email === email) {
          userId = uid;
          break;
        }
      } catch {
        // Skip broken users
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Could not create or find user. The email may belong to a broken auth record." },
        { status: 500 }
      );
    }
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

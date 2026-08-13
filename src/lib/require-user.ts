import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function requireUser(): Promise<
  { user: User; error: null } | { user: null; error: NextResponse }
> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, error: null };
}

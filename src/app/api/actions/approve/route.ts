import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeAction } from "@/lib/healing/executor";

/**
 * Approve or reject a proposed optimization action.
 * Requires authentication (Steve only).
 */
export async function POST(request: NextRequest) {
  const serverClient = await createServerClient();

  // Check auth
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { actionId, decision } = await request.json();

  if (!actionId || !["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify action exists and is in proposed state
  const { data: action } = await supabase
    .from("optimization_actions")
    .select("*")
    .eq("id", actionId)
    .eq("status", "proposed")
    .single();

  if (!action) {
    return NextResponse.json({ error: "Action not found or not in proposed state" }, { status: 404 });
  }

  if (decision === "reject") {
    await supabase
      .from("optimization_actions")
      .update({ status: "rejected", approved_by: user.id })
      .eq("id", actionId);

    return NextResponse.json({ status: "rejected" });
  }

  // Approve and execute
  await supabase
    .from("optimization_actions")
    .update({ status: "approved", approved_by: user.id })
    .eq("id", actionId);

  // Execute the action
  try {
    await executeAction(actionId);
    return NextResponse.json({ status: "approved_and_executed" });
  } catch (err) {
    return NextResponse.json({
      status: "approved_but_failed",
      error: err instanceof Error ? err.message : "Execution failed",
    }, { status: 500 });
  }
}

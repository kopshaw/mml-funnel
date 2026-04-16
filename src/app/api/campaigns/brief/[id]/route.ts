import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/campaigns/brief/[id]
 *
 * Returns a campaign brief including its generated_content for display
 * on the review page. Auth required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("campaign_briefs")
    .select(
      "id, status, brand_name, offer_name, offer_type, generated_content, funnel_id, client_id, created_at, updated_at, generated_at"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Brief not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

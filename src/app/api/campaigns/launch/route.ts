import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { launchCampaign } from "@/lib/ai/campaign-launcher";

/**
 * POST /api/campaigns/launch
 *
 * Accepts { briefId } and deploys the approved campaign — creating the
 * funnel, stages, baselines, email/SMS sequences, and ad creatives.
 *
 * Returns the newly created funnel ID.
 */
export async function POST(request: NextRequest) {
  let body: { briefId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { briefId } = body;

  if (!briefId || typeof briefId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid briefId" },
      { status: 400 }
    );
  }

  // Verify the brief exists and has generated content
  const supabase = createAdminClient();
  const { data: brief, error: lookupError } = await supabase
    .from("campaign_briefs")
    .select("id, status, offer_name, generated_content")
    .eq("id", briefId)
    .single();

  if (lookupError || !brief) {
    return NextResponse.json(
      { error: `Campaign brief not found: ${briefId}` },
      { status: 404 }
    );
  }

  if (brief.status !== "approved" && brief.status !== "review") {
    return NextResponse.json(
      {
        error: `Brief is in '${brief.status}' status — only approved or review briefs can be launched`,
      },
      { status: 409 }
    );
  }

  if (!brief.generated_content) {
    return NextResponse.json(
      { error: "Brief has no generated content — run generation first" },
      { status: 422 }
    );
  }

  try {
    const funnelId = await launchCampaign(briefId);

    return NextResponse.json({
      briefId,
      funnelId,
      offerName: brief.offer_name,
      status: "launched",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Campaign launch failed";

    console.error(`[campaigns/launch] Error for brief ${briefId}:`, err);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCampaignContent } from "@/lib/ai/campaign-architect";

/**
 * POST /api/campaigns/generate
 *
 * Accepts { briefId } and runs the AI Campaign Architect to generate
 * all funnel content (landing page, emails, SMS, ads, agent prompt, stages).
 *
 * Returns the generated content for review before launch.
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

  // Verify the brief exists before kicking off generation
  const supabase = createAdminClient();
  const { data: brief, error: lookupError } = await supabase
    .from("campaign_briefs")
    .select("id, status, offer_name")
    .eq("id", briefId)
    .single();

  if (lookupError || !brief) {
    return NextResponse.json(
      { error: `Campaign brief not found: ${briefId}` },
      { status: 404 }
    );
  }

  if (brief.status !== "draft" && brief.status !== "review") {
    return NextResponse.json(
      {
        error: `Brief is in '${brief.status}' status — only draft or review briefs can be generated`,
      },
      { status: 409 }
    );
  }

  try {
    const content = await generateCampaignContent(briefId);

    return NextResponse.json({
      briefId,
      offerName: brief.offer_name,
      status: "review",
      content,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Campaign generation failed";

    console.error(`[campaigns/generate] Error for brief ${briefId}:`, err);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

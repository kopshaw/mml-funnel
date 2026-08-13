import { NextRequest, NextResponse } from "next/server";
import { analyzeFunnels } from "@/lib/healing/analyzer";
import { requireCronSecret } from "@/lib/cron-auth";

/**
 * Trigger the self-healing analysis loop.
 * Called by cron every 30 minutes.
 */
export async function POST(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  try {
    await analyzeFunnels();
    return NextResponse.json({ status: "analysis_complete", timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[heal] Analysis failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

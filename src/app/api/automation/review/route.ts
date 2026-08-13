import { NextRequest, NextResponse } from "next/server";
import { reviewActions } from "@/lib/healing/reviewer";
import { requireCronSecret } from "@/lib/cron-auth";

/**
 * Review optimization actions that have passed their review window.
 * Called by cron every 6 hours.
 */
export async function POST(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  try {
    await reviewActions();
    return NextResponse.json({ status: "review_complete", timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[review] Action review failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Review failed" },
      { status: 500 }
    );
  }
}

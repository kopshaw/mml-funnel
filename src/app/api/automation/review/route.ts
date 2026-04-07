import { NextResponse } from "next/server";
import { reviewActions } from "@/lib/healing/reviewer";

/**
 * Review optimization actions that have passed their review window.
 * Called by cron every 6 hours.
 */
export async function POST() {
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

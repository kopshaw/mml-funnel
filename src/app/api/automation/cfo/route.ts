import { NextRequest, NextResponse } from "next/server";
import { runCfoAnalysis } from "@/lib/cfo/analyzer";

/**
 * POST /api/automation/cfo
 *
 * Runs the CFO agent across all active clients.
 * Called by cron once daily (e.g., 6am UTC).
 *
 * Cron secret required to prevent external triggering.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = request.headers.get("x-cron-secret");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runCfoAnalysis();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[automation/cfo] Analysis failed:", message);
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

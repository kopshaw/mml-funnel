import { NextRequest, NextResponse } from "next/server";
import { runCfoAnalysis } from "@/lib/cfo/analyzer";
import { requireCronSecret } from "@/lib/cron-auth";

/**
 * POST /api/automation/cfo
 *
 * Runs the CFO agent across all active clients.
 * Called by cron once daily (e.g., 6am UTC).
 */
export async function POST(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

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

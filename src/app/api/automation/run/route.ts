import { NextRequest, NextResponse } from "next/server";
import { processAllQueues } from "@/lib/automation/sequence-runner";
import { requireCronSecret } from "@/lib/cron-auth";

/**
 * POST /api/automation/run
 *
 * Trigger processing of all automation queues (email + SMS).
 * Designed to be called by a cron job every 5 minutes.
 */
export async function POST(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  try {
    const results = await processAllQueues();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        email: results.email,
        sms: results.sms,
        totalProcessed: results.totalProcessed,
        totalSent: results.totalSent,
        totalErrors: results.totalErrors,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[automation/run] Fatal error processing queues:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

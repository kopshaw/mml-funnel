import { NextRequest, NextResponse } from "next/server";
import { processAllQueues } from "@/lib/automation/sequence-runner";

/**
 * POST /api/automation/run
 *
 * Trigger processing of all automation queues (email + SMS).
 * Designed to be called by a cron job every 5 minutes.
 *
 * Accepts an optional `x-cron-secret` header for authentication
 * when called from external cron services (Vercel Cron, etc.).
 */
export async function POST(request: NextRequest) {
  // Optional: verify cron secret to prevent unauthorized triggers
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = request.headers.get("x-cron-secret");
    if (provided !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

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

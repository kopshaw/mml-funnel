import { createAdminClient } from "@/lib/supabase/admin";
import { chat } from "@/lib/ai/client";

/**
 * Review optimization actions that have passed their review window.
 * Compares before/after metrics to determine if the action was positive.
 * Runs every 6 hours via cron.
 */
export async function reviewActions(): Promise<void> {
  const supabase = createAdminClient();

  // Find actions due for review
  const { data: actions, error } = await supabase
    .from("optimization_actions")
    .select("*")
    .eq("status", "executed")
    .lte("review_at", new Date().toISOString());

  if (error || !actions?.length) return;

  for (const action of actions) {
    try {
      await reviewSingleAction(action.id);
    } catch (err) {
      console.error(`Failed to review action ${action.id}:`, err);
    }
  }
}

async function reviewSingleAction(actionId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: action } = await supabase
    .from("optimization_actions")
    .select("*")
    .eq("id", actionId)
    .single();

  if (!action || !action.funnel_stage_id) return;

  // Get metrics BEFORE the action was executed
  const executedAt = action.executed_at;
  if (!executedAt) return;

  const beforeWindow = new Date(new Date(executedAt).getTime() - 48 * 60 * 60 * 1000).toISOString();

  const { data: beforeMetrics } = await supabase
    .from("metric_snapshots")
    .select("metric_value, sample_size")
    .eq("funnel_stage_id", action.funnel_stage_id)
    .eq("metric_name", "conversion_rate")
    .gte("snapshot_time", beforeWindow)
    .lte("snapshot_time", executedAt)
    .order("snapshot_time", { ascending: false })
    .limit(5);

  // Get metrics AFTER the action
  const { data: afterMetrics } = await supabase
    .from("metric_snapshots")
    .select("metric_value, sample_size")
    .eq("funnel_stage_id", action.funnel_stage_id)
    .eq("metric_name", "conversion_rate")
    .gte("snapshot_time", executedAt)
    .order("snapshot_time", { ascending: false })
    .limit(5);

  if (!beforeMetrics?.length || !afterMetrics?.length) {
    // Not enough data to assess — extend review window
    const newReviewAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("optimization_actions")
      .update({ review_at: newReviewAt })
      .eq("id", actionId);
    return;
  }

  // Calculate averages
  const avgBefore =
    beforeMetrics.reduce((sum, m) => sum + Number(m.metric_value), 0) / beforeMetrics.length;
  const avgAfter =
    afterMetrics.reduce((sum, m) => sum + Number(m.metric_value), 0) / afterMetrics.length;
  const totalSampleAfter = afterMetrics.reduce((sum, m) => sum + m.sample_size, 0);

  const percentChange = avgBefore > 0 ? ((avgAfter - avgBefore) / avgBefore) * 100 : 0;

  // Determine verdict
  let verdict: "positive" | "neutral" | "negative";
  if (percentChange > 5 && totalSampleAfter >= 30) {
    verdict = "positive";
  } else if (percentChange < -5 && totalSampleAfter >= 30) {
    verdict = "negative";
  } else {
    verdict = "neutral";
  }

  const impactAssessment = {
    avg_before: avgBefore,
    avg_after: avgAfter,
    percent_change: percentChange,
    total_sample_after: totalSampleAfter,
    before_data_points: beforeMetrics.length,
    after_data_points: afterMetrics.length,
  };

  // Update action with verdict
  await supabase
    .from("optimization_actions")
    .update({
      status: verdict === "negative" ? "reverted" : "kept",
      impact_assessment: impactAssessment,
      impact_verdict: verdict,
    })
    .eq("id", actionId);

  // If negative, create revert action
  if (verdict === "negative" && action.previous_state) {
    await supabase.from("optimization_actions").insert({
      funnel_id: action.funnel_id,
      funnel_stage_id: action.funnel_stage_id,
      action_type: "revert_previous_action",
      risk_tier: "low",
      status: "approved",
      diagnosis: `Reverting "${action.action_type}" — metric dropped ${percentChange.toFixed(1)}% after change.`,
      action_details: {
        original_action_id: actionId,
        revert_to: action.previous_state,
      },
      approved_by: "auto",
    });

    // Check for escalation (3 consecutive failures on same stage)
    await checkEscalation(action.funnel_id, action.funnel_stage_id);
  }

  // Create alert about the review result
  await supabase.from("alerts").insert({
    funnel_id: action.funnel_id,
    optimization_action_id: actionId,
    severity: verdict === "negative" ? "warning" : "info",
    title: `Review complete: ${action.action_type.replace(/_/g, " ")} — ${verdict}`,
    message: `${percentChange > 0 ? "+" : ""}${percentChange.toFixed(1)}% change in conversion rate (${avgBefore.toFixed(3)} → ${avgAfter.toFixed(3)})`,
  });
}

async function checkEscalation(funnelId: string, stageId: string): Promise<void> {
  const supabase = createAdminClient();

  // Count recent reverted/failed actions on this stage
  const { count } = await supabase
    .from("optimization_actions")
    .select("*", { count: "exact", head: true })
    .eq("funnel_id", funnelId)
    .eq("funnel_stage_id", stageId)
    .in("status", ["reverted", "failed"])
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if ((count ?? 0) >= 3) {
    // Escalate to Steve
    await supabase.from("alerts").insert({
      funnel_id: funnelId,
      severity: "critical",
      title: "Escalation: Persistent bottleneck needs manual review",
      message: `3+ automated fixes have failed on this stage in the past week. Human intervention recommended.`,
    });

    await supabase.from("optimization_actions").insert({
      funnel_id: funnelId,
      funnel_stage_id: stageId,
      action_type: "escalate_to_human",
      risk_tier: "high",
      status: "proposed",
      diagnosis: "Automated optimizations have repeatedly failed on this stage. Manual review needed to identify root cause.",
      action_details: { reason: "3_consecutive_failures" },
    });
  }
}

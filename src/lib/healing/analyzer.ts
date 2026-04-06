import { createAdminClient } from "@/lib/supabase/admin";
import { chat } from "@/lib/ai/client";
import { executeAction } from "./executor";

interface Funnel {
  id: string;
  name: string;
  offer_type: string;
  offer_price_cents: number;
  status: string;
  [key: string]: unknown;
}

interface FunnelStage {
  id: string;
  funnel_id: string;
  stage_type: string;
  stage_order: number;
  stage_name: string;
  [key: string]: unknown;
}

interface StageBaseline {
  id: string;
  funnel_stage_id: string;
  metric_name: string;
  baseline_value: number;
  warning_threshold: number;
  critical_threshold: number;
  minimum_sample_size: number;
  [key: string]: unknown;
}

interface StageAnalysis {
  stage: FunnelStage;
  baseline: StageBaseline | null;
  currentValue: number | null;
  sampleSize: number;
  health: "healthy" | "warning" | "critical" | "no_data" | "insufficient_data";
}

interface Diagnosis {
  bottleneckStage: StageAnalysis;
  diagnosis: string;
  recommendedAction: string;
  actionType: string;
  riskTier: "low" | "medium" | "high";
  actionDetails: Record<string, unknown>;
}

const MAX_ACTIONS_PER_DAY = 3;
const MIN_HOURS_BETWEEN_ACTIONS = 4;

/**
 * Core self-healing analysis loop.
 * Runs every 30 minutes via cron to detect and fix funnel bottlenecks.
 */
export async function analyzeFunnels(): Promise<void> {
  const supabase = createAdminClient();

  // Get all active funnels
  const { data: funnels, error } = await supabase
    .from("funnels")
    .select("*")
    .eq("status", "active");

  if (error || !funnels?.length) return;

  for (const funnel of funnels) {
    try {
      await analyzeSingleFunnel(funnel);
    } catch (err) {
      console.error(`Error analyzing funnel ${funnel.id}:`, err);
      // Create alert for failed analysis
      await supabase.from("alerts").insert({
        funnel_id: funnel.id,
        severity: "warning",
        title: `Analysis failed for ${funnel.name}`,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
}

async function analyzeSingleFunnel(funnel: Funnel): Promise<void> {
  const supabase = createAdminClient();

  // 1. COLLECT — Get all stages with their baselines and latest metrics
  const stages = await getStagesWithMetrics(funnel.id);
  if (!stages.length) return;

  // 2. COMPARE — Find bottleneck stages
  const bottlenecks = stages.filter(
    (s) => s.health === "critical" || s.health === "warning"
  );

  if (!bottlenecks.length) return; // Funnel is healthy

  // Check safety guards before taking action
  const canAct = await checkSafetyGuards(funnel.id);
  if (!canAct) return;

  // 3. IDENTIFY — Prioritize the worst bottleneck
  const worstBottleneck = bottlenecks.sort((a, b) => {
    if (a.health === "critical" && b.health !== "critical") return -1;
    if (b.health === "critical" && a.health !== "critical") return 1;
    // Among same severity, pick the one furthest below threshold
    const aDelta = (a.currentValue ?? 0) - (a.baseline?.critical_threshold ?? 0);
    const bDelta = (b.currentValue ?? 0) - (b.baseline?.critical_threshold ?? 0);
    return aDelta - bDelta;
  })[0];

  // 4. DIAGNOSE — Use Claude to analyze the drop
  const diagnosis = await diagnoseBottleneck(funnel, worstBottleneck, stages);
  if (!diagnosis) return;

  // 5. DECIDE + LOG — Create optimization action
  const { data: action } = await supabase
    .from("optimization_actions")
    .insert({
      funnel_id: funnel.id,
      funnel_stage_id: worstBottleneck.stage.id,
      action_type: diagnosis.actionType,
      risk_tier: diagnosis.riskTier,
      status: diagnosis.riskTier === "low" ? "approved" : "proposed",
      diagnosis: diagnosis.diagnosis,
      action_details: diagnosis.actionDetails,
      approved_by: diagnosis.riskTier === "low" ? "auto" : null,
      review_window_hours: 48,
    })
    .select()
    .single();

  if (!action) return;

  // 6. EXECUTE — Low-risk actions auto-execute
  if (diagnosis.riskTier === "low") {
    await executeAction(action.id);
  } else {
    // Create alert for Steve to approve
    await supabase.from("alerts").insert({
      funnel_id: funnel.id,
      optimization_action_id: action.id,
      severity: diagnosis.riskTier === "high" ? "critical" : "warning",
      title: `Action proposed: ${diagnosis.actionType.replace(/_/g, " ")}`,
      message: diagnosis.diagnosis,
    });
  }
}

async function getStagesWithMetrics(funnelId: string): Promise<StageAnalysis[]> {
  const supabase = createAdminClient();

  const { data: stages } = await supabase
    .from("funnel_stages")
    .select("*")
    .eq("funnel_id", funnelId)
    .order("stage_order");

  if (!stages?.length) return [];

  const results: StageAnalysis[] = [];

  for (const stage of stages) {
    // Get baseline
    const { data: baselines } = await supabase
      .from("stage_baselines")
      .select("*")
      .eq("funnel_stage_id", stage.id)
      .eq("metric_name", "conversion_rate")
      .limit(1);

    const baseline = baselines?.[0] ?? null;

    // Get latest metric snapshot
    const { data: snapshots } = await supabase
      .from("metric_snapshots")
      .select("*")
      .eq("funnel_stage_id", stage.id)
      .eq("metric_name", "conversion_rate")
      .order("snapshot_time", { ascending: false })
      .limit(1);

    const latest = snapshots?.[0];
    const currentValue = latest?.metric_value ?? null;
    const sampleSize = latest?.sample_size ?? 0;

    let health: StageAnalysis["health"] = "no_data";
    if (currentValue !== null && baseline) {
      if (sampleSize < baseline.minimum_sample_size) {
        health = "insufficient_data";
      } else if (currentValue < baseline.critical_threshold) {
        health = "critical";
      } else if (currentValue < baseline.warning_threshold) {
        health = "warning";
      } else {
        health = "healthy";
      }
    }

    results.push({ stage, baseline, currentValue, sampleSize, health });
  }

  return results;
}

async function checkSafetyGuards(funnelId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Check max actions per day
  const { count } = await supabase
    .from("optimization_actions")
    .select("*", { count: "exact", head: true })
    .eq("funnel_id", funnelId)
    .gte("created_at", twentyFourHoursAgo)
    .in("status", ["approved", "executing", "executed", "kept"]);

  if ((count ?? 0) >= MAX_ACTIONS_PER_DAY) return false;

  // Check minimum time between actions on same stage
  const fourHoursAgo = new Date(Date.now() - MIN_HOURS_BETWEEN_ACTIONS * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("optimization_actions")
    .select("*", { count: "exact", head: true })
    .eq("funnel_id", funnelId)
    .gte("created_at", fourHoursAgo)
    .in("status", ["approved", "executing", "executed"]);

  if ((recentCount ?? 0) > 0) return false;

  return true;
}

async function diagnoseBottleneck(
  funnel: Funnel,
  bottleneck: StageAnalysis,
  allStages: StageAnalysis[]
): Promise<Diagnosis | null> {
  const stagesSummary = allStages.map((s) => ({
    name: s.stage.stage_name,
    type: s.stage.stage_type,
    health: s.health,
    currentRate: s.currentValue,
    baseline: s.baseline?.baseline_value,
    warningThreshold: s.baseline?.warning_threshold,
    criticalThreshold: s.baseline?.critical_threshold,
    sampleSize: s.sampleSize,
  }));

  const systemPrompt = `You are an expert marketing funnel analyst for a business operations consultancy.
You analyze funnel performance data and recommend specific, actionable optimizations.

AVAILABLE ACTIONS (pick one):
- swap_email_subject: Change email subject line (low risk)
- swap_email_body: Change email body copy (low risk)
- change_email_timing: Adjust email send timing (low risk)
- adjust_ad_budget: Change ad spend by <20% (medium risk) or >20% (high risk)
- adjust_ad_targeting: Modify audience targeting (medium risk)
- launch_ad_variant: Create new ad creative (medium risk)
- change_cta: Modify call-to-action text/design (low risk for email, medium for page)
- swap_landing_page: Switch to different page variant (high risk)
- pause_ad: Stop underperforming ad (high risk)
- trigger_sms_sequence: Add SMS touchpoint (low risk)
- escalate_to_human: Flag for manual review (when unsure)

RISK CLASSIFICATION:
- low: bounded downside, easy to revert (email copy changes, CTA text)
- medium: moderate impact, takes time to measure (ad budget <20%, targeting, new variants)
- high: significant impact, hard to undo quickly (pause campaign, swap page, budget >20%)

Respond with JSON only.`;

  const userMessage = `Analyze this funnel bottleneck:

FUNNEL: ${funnel.name} (${funnel.offer_type}, $${(funnel.offer_price_cents / 100).toFixed(0)})

ALL STAGES:
${JSON.stringify(stagesSummary, null, 2)}

BOTTLENECK STAGE: ${bottleneck.stage.stage_name} (${bottleneck.stage.stage_type})
- Current rate: ${bottleneck.currentValue}
- Baseline: ${bottleneck.baseline?.baseline_value}
- Warning threshold: ${bottleneck.baseline?.warning_threshold}
- Critical threshold: ${bottleneck.baseline?.critical_threshold}
- Sample size: ${bottleneck.sampleSize}
- Health: ${bottleneck.health}

Diagnose the likely cause and recommend ONE specific action.

Respond as JSON:
{
  "diagnosis": "2-3 sentence analysis of why this stage is underperforming",
  "recommended_action": "specific description of what to do",
  "action_type": "one of the available actions above",
  "risk_tier": "low | medium | high",
  "action_details": { specific parameters for the action }
}`;

  try {
    const response = await chat(systemPrompt, [
      { role: "user", content: userMessage },
    ]);

    const parsed = JSON.parse(response.content);
    return {
      bottleneckStage: bottleneck,
      diagnosis: parsed.diagnosis,
      recommendedAction: parsed.recommended_action,
      actionType: parsed.action_type,
      riskTier: parsed.risk_tier,
      actionDetails: parsed.action_details,
    };
  } catch (err) {
    console.error("Failed to diagnose bottleneck:", err);
    return null;
  }
}

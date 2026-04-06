import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

const MAX_ACTIONS_PER_DAY = 3;
const MIN_HOURS_BETWEEN_ACTIONS = 4;

Deno.serve(async (_req) => {
  try {
    // Get all active funnels
    const { data: funnels } = await supabase
      .from("funnels")
      .select("*")
      .eq("status", "active");

    if (!funnels?.length) {
      return new Response(JSON.stringify({ message: "No active funnels" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const funnel of funnels) {
      try {
        const result = await analyzeFunnel(funnel);
        results.push({ funnel: funnel.name, ...result });
      } catch (err) {
        results.push({
          funnel: funnel.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify({ analyzed: results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function analyzeFunnel(funnel: Record<string, unknown>) {
  const funnelId = funnel.id as string;

  // Get stages with latest metrics
  const { data: stages } = await supabase
    .from("funnel_stages")
    .select("*")
    .eq("funnel_id", funnelId)
    .order("stage_order");

  if (!stages?.length) return { status: "no_stages" };

  // Get baselines and latest snapshots for each stage
  const stageAnalysis = [];

  for (const stage of stages) {
    const { data: baselines } = await supabase
      .from("stage_baselines")
      .select("*")
      .eq("funnel_stage_id", stage.id)
      .eq("metric_name", "conversion_rate")
      .limit(1);

    const baseline = baselines?.[0];

    const { data: snapshots } = await supabase
      .from("metric_snapshots")
      .select("*")
      .eq("funnel_stage_id", stage.id)
      .eq("metric_name", "conversion_rate")
      .order("snapshot_time", { ascending: false })
      .limit(1);

    const latest = snapshots?.[0];
    const currentValue = latest ? Number(latest.metric_value) : null;
    const sampleSize = latest?.sample_size ?? 0;

    let health = "no_data";
    if (currentValue !== null && baseline) {
      const minSample = baseline.minimum_sample_size ?? 50;
      if (sampleSize < minSample) health = "insufficient_data";
      else if (currentValue < Number(baseline.critical_threshold)) health = "critical";
      else if (currentValue < Number(baseline.warning_threshold)) health = "warning";
      else health = "healthy";
    }

    stageAnalysis.push({
      stage,
      baseline,
      currentValue,
      sampleSize,
      health,
    });
  }

  // Find bottlenecks
  const bottlenecks = stageAnalysis.filter(
    (s) => s.health === "critical" || s.health === "warning"
  );

  if (!bottlenecks.length) return { status: "healthy", stages: stageAnalysis.length };

  // Safety guards
  const canAct = await checkSafetyGuards(funnelId);
  if (!canAct) return { status: "safety_guard_active", bottlenecks: bottlenecks.length };

  // Get worst bottleneck
  const worst = bottlenecks.sort((a, b) => {
    if (a.health === "critical" && b.health !== "critical") return -1;
    if (b.health === "critical" && a.health !== "critical") return 1;
    return (a.currentValue ?? 0) - (b.currentValue ?? 0);
  })[0];

  // Diagnose with Claude
  const diagnosis = await diagnoseWithClaude(funnel, worst, stageAnalysis);
  if (!diagnosis) return { status: "diagnosis_failed" };

  // Create action
  const { data: action } = await supabase
    .from("optimization_actions")
    .insert({
      funnel_id: funnelId,
      funnel_stage_id: worst.stage.id,
      action_type: diagnosis.action_type,
      risk_tier: diagnosis.risk_tier,
      status: diagnosis.risk_tier === "low" ? "approved" : "proposed",
      diagnosis: diagnosis.diagnosis,
      action_details: diagnosis.action_details,
      approved_by: diagnosis.risk_tier === "low" ? "auto" : null,
    })
    .select()
    .single();

  // Create alert for non-auto actions
  if (diagnosis.risk_tier !== "low") {
    await supabase.from("alerts").insert({
      funnel_id: funnelId,
      optimization_action_id: action?.id,
      severity: diagnosis.risk_tier === "high" ? "critical" : "warning",
      title: `Proposed: ${diagnosis.action_type.replace(/_/g, " ")}`,
      message: diagnosis.diagnosis,
    });
  }

  return {
    status: "action_created",
    action_type: diagnosis.action_type,
    risk_tier: diagnosis.risk_tier,
    auto_approved: diagnosis.risk_tier === "low",
  };
}

async function checkSafetyGuards(funnelId: string): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("optimization_actions")
    .select("*", { count: "exact", head: true })
    .eq("funnel_id", funnelId)
    .gte("created_at", twentyFourHoursAgo)
    .in("status", ["approved", "executing", "executed", "kept"]);

  if ((count ?? 0) >= MAX_ACTIONS_PER_DAY) return false;

  const fourHoursAgo = new Date(
    Date.now() - MIN_HOURS_BETWEEN_ACTIONS * 60 * 60 * 1000
  ).toISOString();

  const { count: recentCount } = await supabase
    .from("optimization_actions")
    .select("*", { count: "exact", head: true })
    .eq("funnel_id", funnelId)
    .gte("created_at", fourHoursAgo)
    .in("status", ["approved", "executing", "executed"]);

  return (recentCount ?? 0) === 0;
}

async function diagnoseWithClaude(
  funnel: Record<string, unknown>,
  bottleneck: Record<string, unknown>,
  allStages: Array<Record<string, unknown>>
) {
  const stagesSummary = allStages.map((s: Record<string, unknown>) => ({
    name: (s.stage as Record<string, unknown>).stage_name,
    type: (s.stage as Record<string, unknown>).stage_type,
    health: s.health,
    currentRate: s.currentValue,
    baseline: s.baseline
      ? (s.baseline as Record<string, unknown>).baseline_value
      : null,
    sampleSize: s.sampleSize,
  }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a funnel optimization expert. Analyze this bottleneck and recommend ONE action.

FUNNEL: ${funnel.name} (${funnel.offer_type})

STAGES: ${JSON.stringify(stagesSummary)}

BOTTLENECK: ${JSON.stringify({
            name: (bottleneck.stage as Record<string, unknown>).stage_name,
            type: (bottleneck.stage as Record<string, unknown>).stage_type,
            health: bottleneck.health,
            currentRate: bottleneck.currentValue,
            baseline: bottleneck.baseline
              ? (bottleneck.baseline as Record<string, unknown>).baseline_value
              : null,
          })}

Available actions: swap_email_subject (low), swap_email_body (low), change_cta (low), trigger_sms_sequence (low), adjust_ad_budget (medium), adjust_ad_targeting (medium), launch_ad_variant (medium), swap_landing_page (high), pause_ad (high).

Return JSON only:
{"diagnosis":"...","action_type":"...","risk_tier":"low|medium|high","action_details":{}}`,
        },
      ],
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * CFO Agent — analyzer.
 *
 * Runs daily (via cron). For each client:
 *   1. Pull last 7d + 30d integration usage cost (AI tokens, SMS, email)
 *   2. Pull last 7d + 30d revenue (closed_won events)
 *   3. Compute burn rate, monthly projection, margin, unit economics
 *   4. Compare to tier budget + thresholds
 *   5. Log insights (cfo_insights table)
 *   6. Take automatic actions (model_policy_overrides) for clear-cut cases
 *   7. Escalate ambiguous cases as alerts for Steve to decide
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tier = "trial" | "starter" | "pro" | "agency" | "enterprise" | "internal";

interface ClientFinancials {
  client_id: string;
  client_name: string;
  client_slug: string;
  tier: Tier;
  ai_budget_cents_monthly: number | null;
  trial_ends_at: string | null;

  // Cost breakdown (cents)
  cost_7d_cents: number;
  cost_30d_cents: number;
  cost_7d_by_provider: Record<string, number>;

  // Projected monthly cost (extrapolate from last 7 days)
  projected_monthly_cost_cents: number;

  // Revenue (cents)
  revenue_7d_cents: number;
  revenue_30d_cents: number;

  // Margin
  margin_7d_cents: number;
  margin_30d_cents: number;
  margin_trend: "improving" | "flat" | "declining";

  // Volume
  leads_7d: number;
  leads_30d: number;
  conversions_7d: number;
  conversions_30d: number;

  // Unit economics
  cost_per_lead_cents: number | null;
  cost_per_conversion_cents: number | null;

  // Existing policy overrides (from previous CFO runs)
  active_overrides: Array<{ task_type: string | null; model_key: string; kind: string }>;
}

// Tier budget defaults (monthly, cents) used when client has no explicit budget
const TIER_DEFAULT_BUDGETS: Record<Tier, number | null> = {
  trial: 500,           // $5 monthly AI cap during 14-day trial
  starter: 2500,        // $25
  pro: 10000,           // $100
  agency: 30000,        // $300
  enterprise: 100000,   // $1,000
  internal: null,       // unlimited
};

// If projected monthly spend exceeds this fraction of budget, we demote
const BURN_WARNING_RATIO = 0.7;   // 70% of budget → warning
const BURN_CRITICAL_RATIO = 0.9;  // 90% → auto-demote
const BURN_EXCEEDED_RATIO = 1.0;  // 100% → aggressive demote + alert

// Override duration when CFO demotes a task
const DEMOTION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Tasks safe to demote without quality risk — these are framework-based copy
const SAFE_TO_DEMOTE: string[] = [
  "section_copy",
  "email_copy",
  "ad_copy",
  "daily_report",
];

const CHEAP_FALLBACK_MODELS: Record<string, string> = {
  // Preferred demotion targets when the primary model is Haiku/GPT-4o-mini
  anthropic: "claude-3-haiku-20240307",
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
};

// ---------------------------------------------------------------------------
// Main entry — called by cron
// ---------------------------------------------------------------------------

export async function runCfoAnalysis(): Promise<{
  clients_analyzed: number;
  insights_created: number;
  policy_overrides_created: number;
  overrides_expired: number;
}> {
  const supabase = createAdminClient();

  // First, expire any stale overrides
  const { error: expireError } = await supabase.rpc("expire_stale_model_overrides");
  if (expireError) {
    console.warn("[cfo] expire_stale_model_overrides failed:", expireError.message);
  }

  // Load every active client
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, name, slug, tier, ai_budget_cents_monthly, trial_ends_at")
    .eq("status", "active");

  if (clientsError || !clients) {
    throw new Error(`Failed to load clients: ${clientsError?.message ?? "unknown"}`);
  }

  let insightsCreated = 0;
  let overridesCreated = 0;

  for (const client of clients) {
    try {
      const financials = await gatherFinancials(client as {
        id: string;
        name: string;
        slug: string;
        tier: Tier;
        ai_budget_cents_monthly: number | null;
        trial_ends_at: string | null;
      });

      const actions = await evaluate(financials);
      for (const a of actions) {
        if (a.type === "insight") insightsCreated++;
        if (a.type === "override") overridesCreated++;
      }
    } catch (err) {
      console.error(
        `[cfo] Analysis failed for client ${client.id}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return {
    clients_analyzed: clients.length,
    insights_created: insightsCreated,
    policy_overrides_created: overridesCreated,
    overrides_expired: 0, // RPC doesn't return count; could SELECT COUNT if needed
  };
}

// ---------------------------------------------------------------------------
// Financials gathering
// ---------------------------------------------------------------------------

async function gatherFinancials(client: {
  id: string;
  name: string;
  slug: string;
  tier: Tier;
  ai_budget_cents_monthly: number | null;
  trial_ends_at: string | null;
}): Promise<ClientFinancials> {
  const supabase = createAdminClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Load all usage rows in the last 30d in one go
  const { data: usage } = await supabase
    .from("integration_usage")
    .select("integration_type, cost_cents, occurred_at")
    .eq("client_id", client.id)
    .gte("occurred_at", thirtyDaysAgo.toISOString());

  const usageRows = usage ?? [];

  const cost_7d_by_provider: Record<string, number> = {};
  let cost_7d_cents = 0;
  let cost_30d_cents = 0;

  for (const row of usageRows) {
    const c = row.cost_cents ?? 0;
    cost_30d_cents += c;
    if (row.occurred_at >= sevenDaysAgo.toISOString()) {
      cost_7d_cents += c;
      const provider = row.integration_type as string;
      cost_7d_by_provider[provider] = (cost_7d_by_provider[provider] ?? 0) + c;
    }
  }

  // Linear extrapolation: 7d cost × (30/7) as monthly projection
  const projected_monthly_cost_cents = Math.round(cost_7d_cents * (30 / 7));

  // Revenue and leads via client's funnels
  const { data: clientFunnels } = await supabase
    .from("funnels")
    .select("id")
    .eq("client_id", client.id);

  const funnelIds = (clientFunnels ?? []).map((f: { id: string }) => f.id);

  let revenue_7d_cents = 0;
  let revenue_30d_cents = 0;
  let leads_7d = 0;
  let leads_30d = 0;
  let conversions_7d = 0;
  let conversions_30d = 0;

  if (funnelIds.length > 0) {
    const { data: events } = await supabase
      .from("pipeline_events")
      .select("event_type, event_data, occurred_at, funnel_id")
      .in("funnel_id", funnelIds)
      .gte("occurred_at", thirtyDaysAgo.toISOString());

    for (const e of events ?? []) {
      if (e.event_type === "closed_won") {
        const cents = (e.event_data as { amount_cents?: number } | null)?.amount_cents ?? 0;
        revenue_30d_cents += cents;
        conversions_30d++;
        if (e.occurred_at >= sevenDaysAgo.toISOString()) {
          revenue_7d_cents += cents;
          conversions_7d++;
        }
      }
    }

    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, created_at")
      .eq("client_id", client.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    for (const c of contacts ?? []) {
      leads_30d++;
      if (c.created_at >= sevenDaysAgo.toISOString()) leads_7d++;
    }
  }

  const margin_7d_cents = revenue_7d_cents - cost_7d_cents;
  const margin_30d_cents = revenue_30d_cents - cost_30d_cents;

  // Trend = weekly run rate vs 4-week average
  const weeklyAvg30d = cost_30d_cents / 4;
  let margin_trend: "improving" | "flat" | "declining" = "flat";
  if (cost_7d_cents > weeklyAvg30d * 1.2) margin_trend = "declining";
  else if (cost_7d_cents < weeklyAvg30d * 0.8) margin_trend = "improving";

  // Load active overrides for this client
  const { data: overrides } = await supabase
    .from("model_policy_overrides")
    .select("task_type, model_key, kind")
    .eq("client_id", client.id)
    .eq("active", true);

  return {
    client_id: client.id,
    client_name: client.name,
    client_slug: client.slug,
    tier: client.tier,
    ai_budget_cents_monthly:
      client.ai_budget_cents_monthly ?? TIER_DEFAULT_BUDGETS[client.tier] ?? null,
    trial_ends_at: client.trial_ends_at,

    cost_7d_cents,
    cost_30d_cents,
    cost_7d_by_provider,
    projected_monthly_cost_cents,

    revenue_7d_cents,
    revenue_30d_cents,
    margin_7d_cents,
    margin_30d_cents,
    margin_trend,

    leads_7d,
    leads_30d,
    conversions_7d,
    conversions_30d,

    cost_per_lead_cents: leads_7d > 0 ? Math.round(cost_7d_cents / leads_7d) : null,
    cost_per_conversion_cents:
      conversions_7d > 0 ? Math.round(cost_7d_cents / conversions_7d) : null,

    active_overrides: (overrides ?? []) as ClientFinancials["active_overrides"],
  };
}

// ---------------------------------------------------------------------------
// Decision engine
// ---------------------------------------------------------------------------

type CfoAction =
  | { type: "insight"; id?: string }
  | { type: "override"; task_type: string | null; model_key: string };

async function evaluate(f: ClientFinancials): Promise<CfoAction[]> {
  const actions: CfoAction[] = [];

  // Skip internal tier completely — MML has no budget cap
  if (f.tier === "internal") {
    // Still log a healthy checkpoint if costs are rising fast
    if (f.margin_trend === "declining" && f.cost_7d_cents > 100) {
      await logInsight(f, {
        insight_type: "burn_alert",
        severity: "info",
        title: `MML spend trending up: $${(f.cost_7d_cents / 100).toFixed(2)} in last 7d`,
        description: `Projected monthly: $${(f.projected_monthly_cost_cents / 100).toFixed(2)}. Top providers: ${topProviders(f)}. No action taken (internal tier).`,
        current_value_cents: f.cost_7d_cents,
        previous_value_cents: Math.round(f.cost_30d_cents / 4),
      });
      actions.push({ type: "insight" });
    }
    return actions;
  }

  // Trial expiring soon
  if (f.tier === "trial" && f.trial_ends_at) {
    const hoursUntilExpiry =
      (new Date(f.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilExpiry > 0 && hoursUntilExpiry < 72) {
      await logInsight(f, {
        insight_type: "trial_expiring",
        severity: "warning",
        title: `Trial expires in ${Math.round(hoursUntilExpiry)} hours`,
        description: `${f.client_name}'s trial ends at ${new Date(f.trial_ends_at).toLocaleString()}. Convert or freeze.`,
      });
      actions.push({ type: "insight" });
    }
  }

  // Budget check
  const budget = f.ai_budget_cents_monthly;
  if (budget !== null && budget > 0) {
    const burnRatio = f.projected_monthly_cost_cents / budget;

    if (burnRatio >= BURN_EXCEEDED_RATIO) {
      // Blown the budget — aggressive demote + alert
      const insight = await logInsight(f, {
        insight_type: "budget_exceeded",
        severity: "critical",
        title: `Projected AI spend $${(f.projected_monthly_cost_cents / 100).toFixed(2)} exceeds $${(budget / 100).toFixed(2)} monthly budget`,
        description: `${f.client_name} is on track to spend ${(burnRatio * 100).toFixed(0)}% of budget. Auto-demoting all safe tasks to cheapest providers. Consider tier upgrade.`,
        current_value_cents: f.projected_monthly_cost_cents,
        threshold_cents: budget,
        action_taken: "demoted all copy tasks to cheapest available model",
        auto_resolved: false,
        metrics_snapshot: snapshot(f),
      });
      actions.push({ type: "insight" });

      // Demote every safe task
      for (const task of SAFE_TO_DEMOTE) {
        await createOverride(f, task, insight.id, "aggressive budget breach");
        actions.push({ type: "override", task_type: task, model_key: "auto" });
      }
    } else if (burnRatio >= BURN_CRITICAL_RATIO && !f.active_overrides.some((o) => o.kind === "demote")) {
      // 90% of budget → demote the highest-volume task
      const topTask = highestVolumeTask(f);
      const insight = await logInsight(f, {
        insight_type: "model_demoted",
        severity: "warning",
        title: `Auto-demoting ${topTask} — at ${(burnRatio * 100).toFixed(0)}% of monthly budget`,
        description: `Projected spend: $${(f.projected_monthly_cost_cents / 100).toFixed(2)} / $${(budget / 100).toFixed(2)} budget. Demoting ${topTask} to cheaper model for 7 days.`,
        current_value_cents: f.projected_monthly_cost_cents,
        threshold_cents: budget,
        action_taken: `demoted ${topTask}`,
        auto_resolved: false,
        metrics_snapshot: snapshot(f),
      });
      actions.push({ type: "insight" });

      await createOverride(f, topTask, insight.id, "budget at 90%");
      actions.push({ type: "override", task_type: topTask, model_key: "auto" });
    } else if (burnRatio >= BURN_WARNING_RATIO) {
      await logInsight(f, {
        insight_type: "burn_alert",
        severity: "info",
        title: `At ${(burnRatio * 100).toFixed(0)}% of monthly AI budget`,
        description: `${f.client_name} projected to spend $${(f.projected_monthly_cost_cents / 100).toFixed(2)} of $${(budget / 100).toFixed(2)}. Monitoring.`,
        current_value_cents: f.projected_monthly_cost_cents,
        threshold_cents: budget,
        metrics_snapshot: snapshot(f),
      });
      actions.push({ type: "insight" });
    }
  }

  // Margin check — revenue must be > costs for non-trial clients
  if (f.tier !== "trial" && f.revenue_30d_cents > 0 && f.margin_30d_cents < 0) {
    await logInsight(f, {
      insight_type: "margin_negative",
      severity: "critical",
      title: `Negative margin: $${(f.margin_30d_cents / 100).toFixed(2)} over last 30 days`,
      description: `Revenue: $${(f.revenue_30d_cents / 100).toFixed(2)}, Costs: $${(f.cost_30d_cents / 100).toFixed(2)}. Review pricing tier or usage.`,
      current_value_cents: f.margin_30d_cents,
      metrics_snapshot: snapshot(f),
    });
    actions.push({ type: "insight" });
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function topProviders(f: ClientFinancials): string {
  return Object.entries(f.cost_7d_by_provider)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([provider, cents]) => `${provider} ($${(cents / 100).toFixed(2)})`)
    .join(", ");
}

function highestVolumeTask(f: ClientFinancials): string {
  // Heuristic: if anthropic dominates, demote section_copy (highest count).
  // If openai dominates, same. Otherwise default to section_copy.
  // Could be refined by actually looking at operation field.
  void f;
  return "section_copy";
}

function snapshot(f: ClientFinancials): Record<string, unknown> {
  return {
    cost_7d_cents: f.cost_7d_cents,
    cost_30d_cents: f.cost_30d_cents,
    projected_monthly_cost_cents: f.projected_monthly_cost_cents,
    revenue_7d_cents: f.revenue_7d_cents,
    revenue_30d_cents: f.revenue_30d_cents,
    margin_30d_cents: f.margin_30d_cents,
    margin_trend: f.margin_trend,
    leads_7d: f.leads_7d,
    conversions_7d: f.conversions_7d,
    cost_per_lead_cents: f.cost_per_lead_cents,
    cost_per_conversion_cents: f.cost_per_conversion_cents,
    by_provider: f.cost_7d_by_provider,
    tier: f.tier,
    budget: f.ai_budget_cents_monthly,
  };
}

async function logInsight(
  f: ClientFinancials,
  payload: {
    insight_type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    description: string;
    current_value_cents?: number;
    threshold_cents?: number;
    previous_value_cents?: number;
    action_taken?: string;
    auto_resolved?: boolean;
    metrics_snapshot?: Record<string, unknown>;
  }
): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cfo_insights")
    .insert({
      client_id: f.client_id,
      ...payload,
      metrics_snapshot: payload.metrics_snapshot ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[cfo] Failed to log insight:", error.message);
    return { id: "" };
  }
  return { id: data.id as string };
}

async function createOverride(
  f: ClientFinancials,
  taskType: string,
  insightId: string,
  reason: string
): Promise<void> {
  const supabase = createAdminClient();
  const expiresAt = new Date(Date.now() + DEMOTION_DURATION_MS).toISOString();

  // Cheapest model for this task type based on current task policy
  const cheapestModel = pickCheapestFor(taskType);

  await supabase.from("model_policy_overrides").insert({
    client_id: f.client_id,
    task_type: taskType,
    model_key: cheapestModel,
    kind: "demote",
    reason,
    triggering_insight_id: insightId || null,
    expires_at: expiresAt,
    active: true,
  });
}

function pickCheapestFor(_taskType: string): string {
  // For now, always demote to DeepSeek if available (cheapest at $0.27/1M input)
  // Router will fall back if deepseek key isn't set
  return "deepseek-chat";
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
const resendKey = Deno.env.get("RESEND_API_KEY")!;
const reportEmail = Deno.env.get("REPORT_EMAIL") || "steve@metricmentorlabs.com";

const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (_req) => {
  try {
    const report = await generateDailyReport();

    // Send via Resend
    await sendReportEmail(report);

    return new Response(JSON.stringify({ status: "sent", summary: report.executive_summary }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500 }
    );
  }
});

async function generateDailyReport() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get funnel health
  const { data: funnelHealth } = await supabase.from("v_funnel_health").select("*");

  // Get actions taken in last 24 hours
  const { data: actions } = await supabase
    .from("optimization_actions")
    .select("*")
    .gte("created_at", yesterday.toISOString())
    .order("created_at", { ascending: false });

  // Get new leads
  const { count: newLeads } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterday.toISOString());

  // Get conversions (closed_won events)
  const { data: conversions } = await supabase
    .from("pipeline_events")
    .select("event_data")
    .eq("event_type", "closed_won")
    .gte("created_at", yesterday.toISOString());

  const totalRevenueCents = conversions?.reduce(
    (sum, c) => sum + ((c.event_data as Record<string, number>)?.amount_cents || 0),
    0
  ) || 0;

  // Get ad spend
  const { data: adSpend } = await supabase
    .from("ad_metrics")
    .select("spend_cents")
    .gte("period_start", yesterday.toISOString());

  const totalSpendCents = adSpend?.reduce((sum, a) => sum + (a.spend_cents || 0), 0) || 0;

  // Get pending approvals
  const { data: pendingApprovals } = await supabase
    .from("optimization_actions")
    .select("id, action_type, diagnosis, risk_tier")
    .eq("status", "proposed");

  // Generate AI summary
  const reportData = {
    period: `${yesterday.toLocaleDateString()} - ${now.toLocaleDateString()}`,
    funnels: funnelHealth || [],
    actions_taken: (actions || []).length,
    actions_succeeded: (actions || []).filter((a) => a.impact_verdict === "positive").length,
    new_leads: newLeads || 0,
    conversions: conversions?.length || 0,
    revenue_cents: totalRevenueCents,
    spend_cents: totalSpendCents,
    roas: totalSpendCents > 0 ? totalRevenueCents / totalSpendCents : 0,
    pending_approvals: pendingApprovals || [],
  };

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
          content: `Generate a concise daily funnel report. Be direct and action-oriented.

DATA:
${JSON.stringify(reportData, null, 2)}

Write a 3-5 sentence executive summary, then list key metrics, then any actions needed. Keep it brief. Format as plain text suitable for email.`,
        },
      ],
    }),
  });

  const aiData = await response.json();
  const summary = aiData.content?.[0]?.text || "Report generation failed.";

  return {
    ...reportData,
    executive_summary: summary,
    generated_at: now.toISOString(),
  };
}

async function sendReportEmail(report: Record<string, unknown>) {
  const roas = report.roas as number;
  const revenue = ((report.revenue_cents as number) / 100).toFixed(2);
  const spend = ((report.spend_cents as number) / 100).toFixed(2);

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "MML Funnel System <system@metricmentorlabs.com>",
      to: reportEmail,
      subject: `Daily Funnel Report | $${revenue} revenue | ${roas.toFixed(1)}x ROAS`,
      text: report.executive_summary as string,
    }),
  });
}

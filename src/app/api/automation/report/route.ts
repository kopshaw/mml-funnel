import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chat } from "@/lib/ai/client";
import { sendTextEmail } from "@/lib/integrations/resend";

/**
 * Generate and send daily funnel performance report.
 * Called by cron daily at 7:00 AM.
 */
export async function POST() {
  const supabase = createAdminClient();

  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Gather metrics
    const { data: funnelHealth } = await supabase.from("v_funnel_health").select("*");

    const { count: newLeads } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday.toISOString());

    const { data: actions } = await supabase
      .from("optimization_actions")
      .select("action_type, status, impact_verdict")
      .gte("created_at", yesterday.toISOString());

    const { data: sends } = await supabase
      .from("send_log")
      .select("channel")
      .gte("sent_at", yesterday.toISOString());

    const emailsSent = sends?.filter((s) => s.channel === "email").length || 0;
    const smsSent = sends?.filter((s) => s.channel === "sms").length || 0;

    const reportData = {
      period: `${yesterday.toLocaleDateString()} - ${now.toLocaleDateString()}`,
      funnels: funnelHealth || [],
      newLeads: newLeads || 0,
      actionsTaken: actions?.length || 0,
      actionsSucceeded: actions?.filter((a) => a.impact_verdict === "positive").length || 0,
      emailsSent,
      smsSent,
    };

    // Generate AI summary
    const aiSummary = await chat(
      "You are a concise business report writer. Generate a brief daily funnel performance summary. Be direct, highlight wins and concerns.",
      [{ role: "user", content: `Daily report data:\n${JSON.stringify(reportData, null, 2)}\n\nWrite a 3-5 sentence executive summary.` }]
    );

    // Send report email
    const reportEmail = process.env.REPORT_EMAIL || "steve@metricmentorlabs.com";
    await sendTextEmail(
      reportEmail,
      `Daily Funnel Report | ${newLeads} new leads | ${emailsSent} emails sent`,
      `DAILY FUNNEL REPORT\n${reportData.period}\n\n${aiSummary.content}\n\n---\nNew Leads: ${newLeads}\nEmails Sent: ${emailsSent}\nSMS Sent: ${smsSent}\nAI Actions: ${reportData.actionsTaken} (${reportData.actionsSucceeded} positive)\nActive Funnels: ${reportData.funnels.length}`
    );

    return NextResponse.json({ status: "report_sent", to: reportEmail, timestamp: now.toISOString() });
  } catch (err) {
    console.error("[report] Failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Report failed" },
      { status: 500 }
    );
  }
}

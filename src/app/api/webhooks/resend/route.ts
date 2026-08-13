import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySvixSignature } from "@/lib/svix-verify";

/**
 * Handle email events from Resend (delivery, opens, clicks, bounces).
 * Resend sends webhooks for email lifecycle events.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 401 });
  }

  const rawBody = await request.text();
  const valid = verifySvixSignature({
    id: svixId,
    timestamp: svixTimestamp,
    signatureHeader: svixSignature,
    body: rawBody,
    secret,
  });
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const { type, data } = body;

  const supabase = createAdminClient();

  switch (type) {
    case "email.delivered":
      await handleEmailDelivered(supabase, data);
      break;
    case "email.opened":
      await handleEmailOpened(supabase, data);
      break;
    case "email.clicked":
      await handleEmailClicked(supabase, data);
      break;
    case "email.bounced":
      await handleEmailBounced(supabase, data);
      break;
    case "email.complained":
      await handleEmailComplaint(supabase, data);
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleEmailDelivered(supabase: ReturnType<typeof createAdminClient>, data: Record<string, unknown>) {
  const emailId = data.email_id as string;
  const to = (data.to as string[])?.join(", ");

  // Find contact and log event
  if (to) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, funnel_id")
      .eq("email", to)
      .single();

    if (contact) {
      await supabase.from("pipeline_events").insert({
        contact_id: contact.id,
        funnel_id: contact.funnel_id,
        event_type: "email_sent",
        event_data: { email_id: emailId, status: "delivered" },
      });
    }
  }
}

async function handleEmailOpened(supabase: ReturnType<typeof createAdminClient>, data: Record<string, unknown>) {
  const to = (data.to as string[])?.join(", ");

  if (to) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, funnel_id")
      .eq("email", to)
      .single();

    if (contact) {
      await supabase.from("pipeline_events").insert({
        contact_id: contact.id,
        funnel_id: contact.funnel_id,
        event_type: "email_opened",
        event_data: { email_id: data.email_id },
      });
    }
  }
}

async function handleEmailClicked(supabase: ReturnType<typeof createAdminClient>, data: Record<string, unknown>) {
  const to = (data.to as string[])?.join(", ");

  if (to) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, funnel_id")
      .eq("email", to)
      .single();

    if (contact) {
      await supabase.from("pipeline_events").insert({
        contact_id: contact.id,
        funnel_id: contact.funnel_id,
        event_type: "email_clicked",
        event_data: { email_id: data.email_id, click_url: (data as Record<string, unknown>).click_url },
      });
    }
  }
}

async function handleEmailBounced(supabase: ReturnType<typeof createAdminClient>, data: Record<string, unknown>) {
  const to = (data.to as string[])?.join(", ");

  if (to) {
    // Mark contact email as bounced
    await supabase
      .from("contacts")
      .update({ tags: ["email_bounced"] })
      .eq("email", to);
  }
}

async function handleEmailComplaint(supabase: ReturnType<typeof createAdminClient>, data: Record<string, unknown>) {
  const to = (data.to as string[])?.join(", ");

  if (to) {
    await supabase
      .from("contacts")
      .update({ tags: ["email_complaint", "do_not_email"] })
      .eq("email", to);
  }
}

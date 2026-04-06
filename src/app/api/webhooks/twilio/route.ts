import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature as verifyTwilioSignature } from "@/lib/integrations/twilio";
import { handleInboundMessage } from "@/lib/ai/sales-agent";

/**
 * Handle inbound SMS from Twilio.
 * Twilio sends a POST when someone replies to our SMS.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const params = new URLSearchParams(body);

  // Verify Twilio signature
  const signature = request.headers.get("x-twilio-signature") || "";
  const url = request.url;

  if (!verifyTwilioSignature(url, Object.fromEntries(params), signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const from = params.get("From") || "";
  const messageBody = params.get("Body") || "";

  if (!from || !messageBody) {
    return NextResponse.json({ error: "Missing From or Body" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Find contact by phone number
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("phone", from)
    .single();

  if (!contact) {
    // Unknown sender — create a new contact
    const { data: newContact } = await supabase
      .from("contacts")
      .insert({
        phone: from,
        source: "sms_inbound",
        qualification_status: "unknown",
      })
      .select("id")
      .single();

    if (newContact) {
      await handleInboundMessage({
        contactId: newContact.id,
        messageText: messageBody,
        channel: "sms",
        replyTo: from,
      });
    }
  } else {
    await handleInboundMessage({
      contactId: contact.id,
      messageText: messageBody,
      channel: "sms",
      replyTo: from,
    });
  }

  // Twilio expects TwiML response
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    }
  );
}

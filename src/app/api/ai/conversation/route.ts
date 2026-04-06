import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initiateContact, handleInboundMessage } from "@/lib/ai/sales-agent";

/**
 * API route for AI conversation handling.
 * - POST with action "new_lead": Create contact and initiate AI outreach
 * - POST with action "inbound": Handle inbound message from a contact
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  const supabase = createAdminClient();

  switch (action) {
    case "new_lead": {
      const { firstName, lastName, email, phone, funnelId, variantId, ...utmParams } = body;

      // Create contact
      const { data: contact, error } = await supabase
        .from("contacts")
        .insert({
          first_name: firstName,
          last_name: lastName || null,
          email,
          phone: phone || null,
          funnel_id: funnelId,
          source: utmParams.utm_source || "direct",
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
          utm_content: utmParams.utm_content,
          utm_term: utmParams.utm_term,
          qualification_status: "unknown",
        })
        .select("id")
        .single();

      if (error) {
        // Might be duplicate email — find existing
        const { data: existing } = await supabase
          .from("contacts")
          .select("id")
          .eq("email", email)
          .single();

        if (existing) {
          return NextResponse.json({ contactId: existing.id, existing: true });
        }
        return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
      }

      // Log page conversion event
      await supabase.from("pipeline_events").insert({
        contact_id: contact.id,
        funnel_id: funnelId,
        event_type: "page_conversion",
        event_data: { variant_id: variantId, ...utmParams },
      });

      // Initiate AI outreach (async — don't block the form submission)
      const channel = phone ? "sms" : "email";
      initiateContact(contact.id, channel).catch(console.error);

      return NextResponse.json({ contactId: contact.id, status: "created" });
    }

    case "inbound": {
      const { contactId, messageText, channel, replyTo } = body;

      await handleInboundMessage({
        contactId,
        messageText,
        channel,
        replyTo,
      });

      return NextResponse.json({ status: "processed" });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

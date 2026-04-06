import { createAdminClient } from "@/lib/supabase/admin";
import { chat } from "@/lib/ai/client";
import { sendSMS } from "@/lib/integrations/twilio";
import { sendTextEmail } from "@/lib/integrations/resend";
import { createContact as createGHLContact } from "@/lib/integrations/ghl";

interface InboundMessage {
  contactId: string;
  messageText: string;
  channel: "sms" | "email";
  replyTo?: string; // email address or phone number
}

interface AIResponse {
  reply: string;
  internal_notes: string;
  qualification_signals: {
    budget: null | "low" | "medium" | "high";
    authority: null | boolean;
    need: null | "low" | "medium" | "high";
    timeline: null | "immediate" | "30_days" | "90_days" | "someday";
  };
  lead_score_delta: number;
  suggested_action: "continue" | "qualify" | "book" | "disqualify" | "escalate";
  booking_link_needed: boolean;
}

const BOOKING_URL = process.env.NEXT_PUBLIC_APP_URL + "/book";
const MAX_AI_MESSAGES = 5;
const RATE_LIMIT_HOURS = 2;

/**
 * Handle an inbound message from a lead.
 * Routes through Claude for qualification and response generation.
 */
export async function handleInboundMessage(message: InboundMessage): Promise<void> {
  const supabase = createAdminClient();

  // Load contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", message.contactId)
    .single();

  if (!contact) throw new Error(`Contact ${message.contactId} not found`);

  // Load or create conversation
  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("contact_id", message.contactId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        contact_id: message.contactId,
        funnel_id: contact.funnel_id,
        channel: message.channel,
        conversation_type: "qualification",
        messages: [],
      })
      .select()
      .single();
    conversation = newConv!;
  }

  // Rate limit check
  if (conversation.last_message_at) {
    const hoursSinceLastOutbound =
      (Date.now() - new Date(conversation.last_message_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastOutbound < RATE_LIMIT_HOURS) {
      console.log(`Rate limited: ${hoursSinceLastOutbound.toFixed(1)}hrs since last message`);
      return;
    }
  }

  // Check message count limit
  const currentMessages = (conversation.messages as unknown[]) || [];
  const aiMessageCount = currentMessages.filter(
    (m: unknown) => (m as Record<string, string>).role === "assistant"
  ).length;

  if (aiMessageCount >= MAX_AI_MESSAGES) {
    // Escalate — too many messages without resolution
    await escalateConversation(conversation.id, contact, "max_messages_reached");
    return;
  }

  // Append inbound message
  const updatedMessages = [
    ...currentMessages,
    {
      role: "user",
      content: message.messageText,
      timestamp: new Date().toISOString(),
      channel: message.channel,
    },
  ];

  // Load funnel info for context
  let offerType = contact.offer_type || "mid_ticket";
  let offerDescription = "";

  if (contact.funnel_id) {
    const { data: funnel } = await supabase
      .from("funnels")
      .select("*")
      .eq("id", contact.funnel_id)
      .single();

    if (funnel) {
      offerType = funnel.offer_type;
      offerDescription = `${funnel.name} - $${(funnel.offer_price_cents / 100).toFixed(0)}`;
    }
  }

  // Load objection playbook for context
  const { data: playbook } = await supabase
    .from("objection_playbook")
    .select("*")
    .eq("offer_type", offerType)
    .order("effectiveness_score", { ascending: false })
    .limit(5);

  // Build system prompt
  const systemPrompt = buildSystemPrompt(
    offerType,
    offerDescription,
    contact,
    conversation.conversation_type,
    playbook || []
  );

  // Convert messages to Claude format
  const claudeMessages = updatedMessages.map((m: unknown) => {
    const msg = m as Record<string, string>;
    return {
      role: msg.role as "user" | "assistant",
      content: msg.content,
    };
  });

  // Call Claude
  const response = await chat(systemPrompt, claudeMessages);

  let aiResponse: AIResponse;
  try {
    aiResponse = JSON.parse(response.content);
  } catch {
    // If Claude doesn't return valid JSON, wrap the response
    aiResponse = {
      reply: response.content,
      internal_notes: "Failed to parse structured response",
      qualification_signals: { budget: null, authority: null, need: null, timeline: null },
      lead_score_delta: 0,
      suggested_action: "continue",
      booking_link_needed: false,
    };
  }

  // Add booking link if needed
  let replyText = aiResponse.reply;
  if (aiResponse.booking_link_needed) {
    replyText += `\n\nBook a time here: ${BOOKING_URL}`;
  }

  // Append AI response to conversation
  const finalMessages = [
    ...updatedMessages,
    {
      role: "assistant",
      content: replyText,
      timestamp: new Date().toISOString(),
      channel: message.channel,
      internal_notes: aiResponse.internal_notes,
    },
  ];

  // Update conversation
  await supabase
    .from("conversations")
    .update({
      messages: finalMessages,
      message_count: finalMessages.length,
      last_message_at: new Date().toISOString(),
      qualification_signals: aiResponse.qualification_signals,
      status:
        aiResponse.suggested_action === "book"
          ? "booked"
          : aiResponse.suggested_action === "disqualify"
            ? "disqualified"
            : aiResponse.suggested_action === "escalate"
              ? "escalated"
              : "active",
    })
    .eq("id", conversation.id);

  // Update contact lead score
  const newScore = Math.max(0, Math.min(100, (contact.lead_score ?? 0) + aiResponse.lead_score_delta));
  const newStatus =
    aiResponse.suggested_action === "qualify" || aiResponse.suggested_action === "book"
      ? "qualified"
      : aiResponse.suggested_action === "disqualify"
        ? "unqualified"
        : contact.qualification_status;

  await supabase
    .from("contacts")
    .update({
      lead_score: newScore,
      qualification_status: newStatus,
    })
    .eq("id", contact.id);

  // Send the reply
  if (message.channel === "sms" && message.replyTo) {
    await sendSMS(message.replyTo, replyText);
  } else if (message.channel === "email" && message.replyTo) {
    await sendTextEmail(message.replyTo, `Re: ${offerDescription || "Your inquiry"}`, replyText);
  }

  // If qualified, push to GHL
  if (aiResponse.suggested_action === "qualify" || aiResponse.suggested_action === "book") {
    await pushToGHL(contact);
  }

  // Log pipeline event
  await supabase.from("pipeline_events").insert({
    contact_id: contact.id,
    funnel_id: contact.funnel_id,
    event_type: "ai_conversation",
    event_data: {
      action: aiResponse.suggested_action,
      lead_score_delta: aiResponse.lead_score_delta,
      message_count: finalMessages.length,
    },
  });

  // If escalated, create alert
  if (aiResponse.suggested_action === "escalate") {
    await escalateConversation(conversation.id, contact, "ai_recommended");
  }
}

/**
 * Initiate first contact with a new lead.
 */
export async function initiateContact(
  contactId: string,
  channel: "sms" | "email"
): Promise<void> {
  const supabase = createAdminClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (!contact) return;

  let offerType = contact.offer_type || "mid_ticket";
  let offerDescription = "";

  if (contact.funnel_id) {
    const { data: funnel } = await supabase
      .from("funnels")
      .select("*")
      .eq("id", contact.funnel_id)
      .single();

    if (funnel) {
      offerType = funnel.offer_type;
      offerDescription = `${funnel.name} - $${(funnel.offer_price_cents / 100).toFixed(0)}`;
    }
  }

  // Generate initial outreach message
  const systemPrompt = buildSystemPrompt(offerType, offerDescription, contact, "qualification", []);

  const response = await chat(systemPrompt, [
    {
      role: "user",
      content: `[SYSTEM: This is a new lead who just submitted a form. Generate your opening message. Their name is ${contact.first_name || "there"}. They came from ${contact.source || "our website"}.]\n\nGenerate your first outreach message as JSON.`,
    },
  ]);

  let aiResponse: AIResponse;
  try {
    aiResponse = JSON.parse(response.content);
  } catch {
    return;
  }

  // Create conversation
  const messages = [
    {
      role: "assistant",
      content: aiResponse.reply,
      timestamp: new Date().toISOString(),
      channel,
    },
  ];

  await supabase.from("conversations").insert({
    contact_id: contactId,
    funnel_id: contact.funnel_id,
    channel,
    conversation_type: "qualification",
    messages,
    message_count: 1,
    last_message_at: new Date().toISOString(),
  });

  // Send the message
  if (channel === "sms" && contact.phone) {
    await sendSMS(contact.phone, aiResponse.reply);
  } else if (channel === "email" && contact.email) {
    await sendTextEmail(contact.email, offerDescription || "Quick question for you", aiResponse.reply);
  }
}

/**
 * No-show recovery: triggered when a booking is missed.
 */
export async function handleNoShow(contactId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (!contact) return;

  const firstName = contact.first_name || "there";

  // Stage 1: Immediate (15 min after no-show) — empathetic SMS
  const message = `Hey ${firstName}, I noticed we missed our call. No worries at all — things happen! Want to grab a new time? ${BOOKING_URL}`;

  if (contact.phone) {
    await sendSMS(contact.phone, message);
  }

  // Create conversation for tracking
  await supabase.from("conversations").insert({
    contact_id: contactId,
    funnel_id: contact.funnel_id,
    channel: "sms",
    conversation_type: "no_show_recovery",
    messages: [
      {
        role: "assistant",
        content: message,
        timestamp: new Date().toISOString(),
        channel: "sms",
        stage: "immediate",
      },
    ],
    message_count: 1,
    last_message_at: new Date().toISOString(),
  });

  // Update contact status
  await supabase
    .from("contacts")
    .update({ qualification_status: "nurturing" })
    .eq("id", contactId);

  // Log event
  await supabase.from("pipeline_events").insert({
    contact_id: contactId,
    funnel_id: contact.funnel_id,
    event_type: "booking_attended",
    event_data: { attended: false, recovery_initiated: true },
  });
}

function buildSystemPrompt(
  offerType: string,
  offerDescription: string,
  contact: Record<string, unknown>,
  conversationType: string,
  playbook: Array<Record<string, unknown>>
): string {
  const qualificationCriteria =
    offerType === "low_ticket"
      ? "Minimal qualification. Focus on overcoming objections and guiding to purchase."
      : offerType === "mid_ticket"
        ? "Check for: budget awareness, timeline, and fit. Book a short call if qualified."
        : "Full BANT qualification: Budget (can they invest?), Authority (decision maker?), Need (specific problem this solves?), Timeline (ready to act within 30 days?).";

  const playbookContext = playbook.length
    ? `\nOBJECTION HANDLING:\n${playbook
        .map((p) => `- ${p.objection_category}: ${p.response_strategy}`)
        .join("\n")}`
    : "";

  return `You are a conversational sales assistant for Metric Mentor Labs, a business operations consultancy.
Your persona is friendly, consultative, and direct. You never sound like a bot.

CONTEXT:
- Offer: ${offerDescription || offerType}
- Contact name: ${contact.first_name || "Unknown"}
- Source: ${contact.source || "website"}
- Lead score: ${contact.lead_score || 0}/100
- Current status: ${contact.qualification_status || "unknown"}
- Conversation type: ${conversationType}

QUALIFICATION CRITERIA:
${qualificationCriteria}

YOUR OBJECTIVES (in order):
1. Build rapport with a warm, personalized opening
2. Identify their core pain point (ask open-ended questions)
3. Assess fit using qualification criteria (weave naturally, never interrogate)
4. If qualified (score >= 70): suggest a strategy call and provide booking link
5. If unsure: ask one more qualifying question
6. If unqualified: gracefully redirect to a free resource
${playbookContext}

RULES:
- Maximum 3 messages before you either qualify or disqualify
- Never mention pricing until they express genuine need
- Never pressure; use curiosity and relevance
- If they ask something you can't answer: "Great question — I want to make sure Steve gives you the right answer. Would a quick call work?"
- Keep messages under 160 characters for SMS, longer for email
- Never make promises about specific results or guarantees
- Always be honest and transparent

Respond with JSON:
{
  "reply": "your message to send",
  "internal_notes": "your private assessment",
  "qualification_signals": {
    "budget": null | "low" | "medium" | "high",
    "authority": null | true | false,
    "need": null | "low" | "medium" | "high",
    "timeline": null | "immediate" | "30_days" | "90_days" | "someday"
  },
  "lead_score_delta": -10 to 20,
  "suggested_action": "continue | qualify | book | disqualify | escalate",
  "booking_link_needed": true | false
}`;
}

async function escalateConversation(
  conversationId: string,
  contact: Record<string, unknown>,
  reason: string
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from("conversations")
    .update({ status: "escalated" })
    .eq("id", conversationId);

  await supabase.from("alerts").insert({
    funnel_id: contact.funnel_id as string,
    severity: "warning",
    title: `Conversation escalated: ${contact.first_name || "Unknown"} ${contact.last_name || ""}`,
    message: `Reason: ${reason}. Contact: ${contact.email || contact.phone || "no contact info"}`,
  });
}

async function pushToGHL(contact: Record<string, unknown>): Promise<void> {
  try {
    if (!contact.ghl_contact_id) {
      await createGHLContact({
        firstName: contact.first_name as string,
        lastName: contact.last_name as string,
        email: contact.email as string,
        phone: contact.phone as string,
        source: "MML Funnel - AI Qualified",
        tags: ["ai-qualified", contact.offer_type as string],
      });
    }
  } catch (err) {
    console.error("Failed to push to GHL:", err);
  }
}

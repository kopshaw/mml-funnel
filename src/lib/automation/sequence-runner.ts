import { createAdminClient } from "@/lib/supabase/admin";
import { sendTextEmail } from "@/lib/integrations/resend";
import { sendSMS } from "@/lib/integrations/twilio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueueResult {
  processed: number;
  sent: number;
  errors: number;
  completed: number;
}

interface CombinedQueueResult {
  email: QueueResult;
  sms: QueueResult;
  totalProcessed: number;
  totalSent: number;
  totalErrors: number;
}

// ---------------------------------------------------------------------------
// Template variable replacement
// ---------------------------------------------------------------------------

const COMPANY_NAME =
  process.env.COMPANY_NAME ?? "Metric Mentor Labs";

const BOOKING_URL =
  process.env.BOOKING_URL ?? "https://metricmentorlabs.com/book";

function replaceTemplateVars(
  text: string,
  vars: { first_name: string }
): string {
  return text
    .replace(/\{first_name\}/gi, vars.first_name || "there")
    .replace(/\{booking_url\}/gi, BOOKING_URL)
    .replace(/\{company_name\}/gi, COMPANY_NAME);
}

// ---------------------------------------------------------------------------
// Email Queue Processor
// ---------------------------------------------------------------------------

export async function processEmailQueue(): Promise<QueueResult> {
  const supabase = createAdminClient();
  const result: QueueResult = { processed: 0, sent: 0, errors: 0, completed: 0 };

  // Find all journeys that are due for their next email
  const now = new Date().toISOString();
  const { data: dueJourneys, error: queryError } = await supabase
    .from("contact_journeys")
    .select("*")
    .eq("email_status", "active")
    .lte("email_next_send_at", now);

  if (queryError) {
    console.error("[sequence-runner] Failed to query email queue:", queryError.message);
    return result;
  }

  if (!dueJourneys || dueJourneys.length === 0) {
    return result;
  }

  for (const journey of dueJourneys) {
    result.processed++;

    try {
      const nextStepOrder = (journey.email_current_step as number) + 1;

      // Load the next email step in this sequence
      const { data: step, error: stepError } = await supabase
        .from("email_sequence_steps")
        .select("*")
        .eq("sequence_id", journey.email_sequence_id as string)
        .eq("step_order", nextStepOrder)
        .eq("status", "active")
        .single();

      if (stepError || !step) {
        // No more steps -- sequence is complete for this contact
        await supabase
          .from("contact_journeys")
          .update({ email_status: "completed" })
          .eq("id", journey.id as string);

        result.completed++;
        continue;
      }

      // Load the contact
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .select("id, email, first_name")
        .eq("id", journey.contact_id as string)
        .single();

      if (contactError || !contact || !contact.email) {
        console.error(
          `[sequence-runner] Cannot load contact ${journey.contact_id}:`,
          contactError?.message ?? "missing email"
        );
        result.errors++;
        continue;
      }

      // Deduplication: check if we already sent this exact step
      const { data: existingSend } = await supabase
        .from("send_log")
        .select("id")
        .eq("contact_id", contact.id as string)
        .eq("sequence_id", journey.email_sequence_id as string)
        .eq("step_order", nextStepOrder)
        .eq("channel", "email")
        .limit(1);

      if (existingSend && existingSend.length > 0) {
        // Already sent -- advance the step without re-sending
        await advanceEmailStep(supabase, journey, nextStepOrder);
        continue;
      }

      // Replace template variables
      const subject = replaceTemplateVars(step.subject as string, {
        first_name: contact.first_name as string,
      });
      const bodyText = replaceTemplateVars(step.body_text as string, {
        first_name: contact.first_name as string,
      });

      // Send the email
      const sendResult = await sendTextEmail(contact.email as string, subject, bodyText);

      // Log to send_log
      await supabase.from("send_log").insert({
        contact_id: contact.id,
        sequence_id: journey.email_sequence_id,
        step_order: nextStepOrder,
        channel: "email",
        provider_id: sendResult.id,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      // Advance the journey to the next step
      await advanceEmailStep(supabase, journey, nextStepOrder);

      // Create pipeline event
      await supabase.from("pipeline_events").insert({
        contact_id: contact.id,
        funnel_id: journey.funnel_id,
        event_type: "email_sent",
        event_data: {
          sequence_id: journey.email_sequence_id,
          step_order: nextStepOrder,
          subject,
        },
      });

      result.sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[sequence-runner] Email error for journey ${journey.id}:`,
        message
      );
      result.errors++;
    }
  }

  return result;
}

/**
 * Advance the email step on a journey and calculate the next send time.
 */
async function advanceEmailStep(
  supabase: ReturnType<typeof createAdminClient>,
  journey: Record<string, unknown>,
  completedStepOrder: number
) {
  const nextNextOrder = completedStepOrder + 1;

  // Check if there's another step after this one
  const { data: nextStep } = await supabase
    .from("email_sequence_steps")
    .select("delay_hours")
    .eq("sequence_id", journey.email_sequence_id as string)
    .eq("step_order", nextNextOrder)
    .eq("status", "active")
    .single();

  if (nextStep) {
    const delayMs = ((nextStep.delay_hours as number) || 24) * 60 * 60 * 1000;
    const nextSendAt = new Date(Date.now() + delayMs).toISOString();

    await supabase
      .from("contact_journeys")
      .update({
        email_current_step: completedStepOrder,
        email_next_send_at: nextSendAt,
      })
      .eq("id", journey.id as string);
  } else {
    // No more steps -- mark complete
    await supabase
      .from("contact_journeys")
      .update({
        email_current_step: completedStepOrder,
        email_status: "completed",
      })
      .eq("id", journey.id as string);
  }
}

// ---------------------------------------------------------------------------
// SMS Queue Processor
// ---------------------------------------------------------------------------

export async function processSMSQueue(): Promise<QueueResult> {
  const supabase = createAdminClient();
  const result: QueueResult = { processed: 0, sent: 0, errors: 0, completed: 0 };

  const now = new Date().toISOString();
  const { data: dueJourneys, error: queryError } = await supabase
    .from("contact_journeys")
    .select("*")
    .eq("sms_status", "active")
    .lte("sms_next_send_at", now);

  if (queryError) {
    console.error("[sequence-runner] Failed to query SMS queue:", queryError.message);
    return result;
  }

  if (!dueJourneys || dueJourneys.length === 0) {
    return result;
  }

  for (const journey of dueJourneys) {
    result.processed++;

    try {
      const nextStepOrder = (journey.sms_current_step as number) + 1;

      // Load the next SMS step
      const { data: step, error: stepError } = await supabase
        .from("sms_sequence_steps")
        .select("*")
        .eq("sequence_id", journey.sms_sequence_id as string)
        .eq("step_order", nextStepOrder)
        .eq("status", "active")
        .single();

      if (stepError || !step) {
        await supabase
          .from("contact_journeys")
          .update({ sms_status: "completed" })
          .eq("id", journey.id as string);

        result.completed++;
        continue;
      }

      // Load the contact
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .select("id, phone, first_name, funnel_id")
        .eq("id", journey.contact_id as string)
        .single();

      if (contactError || !contact || !contact.phone) {
        console.error(
          `[sequence-runner] Cannot load contact or missing phone for ${journey.contact_id}:`,
          contactError?.message ?? "no phone"
        );
        // If no phone number, complete the SMS sequence instead of retrying forever
        await supabase
          .from("contact_journeys")
          .update({ sms_status: "completed" })
          .eq("id", journey.id as string);

        result.completed++;
        continue;
      }

      // Deduplication
      const { data: existingSend } = await supabase
        .from("send_log")
        .select("id")
        .eq("contact_id", contact.id as string)
        .eq("sequence_id", journey.sms_sequence_id as string)
        .eq("step_order", nextStepOrder)
        .eq("channel", "sms")
        .limit(1);

      if (existingSend && existingSend.length > 0) {
        await advanceSMSStep(supabase, journey, nextStepOrder);
        continue;
      }

      // Replace template variables in message
      const messageText = replaceTemplateVars(step.message as string, {
        first_name: contact.first_name as string,
      });

      // Send SMS
      const smsResult = await sendSMS(contact.phone as string, messageText);

      // Log to send_log
      await supabase.from("send_log").insert({
        contact_id: contact.id,
        sequence_id: journey.sms_sequence_id,
        step_order: nextStepOrder,
        channel: "sms",
        provider_id: smsResult.sid,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      // Advance journey
      await advanceSMSStep(supabase, journey, nextStepOrder);

      // Pipeline event
      await supabase.from("pipeline_events").insert({
        contact_id: contact.id,
        funnel_id: journey.funnel_id,
        event_type: "sms_sent",
        event_data: {
          sequence_id: journey.sms_sequence_id,
          step_order: nextStepOrder,
        },
      });

      result.sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[sequence-runner] SMS error for journey ${journey.id}:`,
        message
      );
      result.errors++;
    }
  }

  return result;
}

/**
 * Advance the SMS step on a journey and calculate the next send time.
 */
async function advanceSMSStep(
  supabase: ReturnType<typeof createAdminClient>,
  journey: Record<string, unknown>,
  completedStepOrder: number
) {
  const nextNextOrder = completedStepOrder + 1;

  const { data: nextStep } = await supabase
    .from("sms_sequence_steps")
    .select("delay_hours")
    .eq("sequence_id", journey.sms_sequence_id as string)
    .eq("step_order", nextNextOrder)
    .eq("status", "active")
    .single();

  if (nextStep) {
    const delayMs = ((nextStep.delay_hours as number) || 24) * 60 * 60 * 1000;
    const nextSendAt = new Date(Date.now() + delayMs).toISOString();

    await supabase
      .from("contact_journeys")
      .update({
        sms_current_step: completedStepOrder,
        sms_next_send_at: nextSendAt,
      })
      .eq("id", journey.id as string);
  } else {
    await supabase
      .from("contact_journeys")
      .update({
        sms_current_step: completedStepOrder,
        sms_status: "completed",
      })
      .eq("id", journey.id as string);
  }
}

// ---------------------------------------------------------------------------
// Combined processor
// ---------------------------------------------------------------------------

export async function processAllQueues(): Promise<CombinedQueueResult> {
  const [email, sms] = await Promise.all([
    processEmailQueue(),
    processSMSQueue(),
  ]);

  return {
    email,
    sms,
    totalProcessed: email.processed + sms.processed,
    totalSent: email.sent + sms.sent,
    totalErrors: email.errors + sms.errors,
  };
}

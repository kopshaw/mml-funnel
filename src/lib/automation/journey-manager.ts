import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JourneyRecord {
  id: string;
  contact_id: string;
  funnel_id: string;
  email_sequence_id: string | null;
  sms_sequence_id: string | null;
  email_status: string;
  sms_status: string;
  email_current_step: number;
  sms_current_step: number;
  email_next_send_at: string | null;
  sms_next_send_at: string | null;
}

// ---------------------------------------------------------------------------
// Enroll a contact into a funnel's sequences
// ---------------------------------------------------------------------------

/**
 * Enroll a contact into the active email and SMS sequences for a funnel.
 *
 * - First email sends immediately (email_next_send_at = now)
 * - First SMS sends after 15 minutes
 * - Idempotent: if a journey already exists for this contact + funnel, returns it
 */
export async function enrollContact(
  contactId: string,
  funnelId: string
): Promise<JourneyRecord> {
  const supabase = createAdminClient();

  // Check for existing journey (idempotent)
  const { data: existing } = await supabase
    .from("contact_journeys")
    .select("*")
    .eq("contact_id", contactId)
    .eq("funnel_id", funnelId)
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0] as unknown as JourneyRecord;
  }

  // Load the funnel to get client_id
  const { data: funnel, error: funnelError } = await supabase
    .from("funnels")
    .select("id, client_id")
    .eq("id", funnelId)
    .single();

  if (funnelError || !funnel) {
    throw new Error(
      `[journey-manager] Cannot load funnel ${funnelId}: ${funnelError?.message ?? "not found"}`
    );
  }

  // Find the active email sequence for this funnel
  const { data: emailSeq } = await supabase
    .from("email_sequences")
    .select("id")
    .eq("funnel_id", funnelId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const emailSequenceId = emailSeq?.[0]?.id ?? null;

  // Find the active SMS sequence for this funnel
  const { data: smsSeq } = await supabase
    .from("sms_sequences")
    .select("id")
    .eq("funnel_id", funnelId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const smsSequenceId = smsSeq?.[0]?.id ?? null;

  if (!emailSequenceId && !smsSequenceId) {
    throw new Error(
      `[journey-manager] No active sequences found for funnel ${funnelId}`
    );
  }

  // Calculate send times
  const now = new Date().toISOString();
  const fifteenMinutesFromNow = new Date(
    Date.now() + 15 * 60 * 1000
  ).toISOString();

  // Create the journey record
  const { data: journey, error: insertError } = await supabase
    .from("contact_journeys")
    .insert({
      contact_id: contactId,
      funnel_id: funnelId,
      client_id: (funnel.client_id as string) || null,
      email_sequence_id: emailSequenceId,
      email_current_step: 0,
      email_status: emailSequenceId ? "active" : "completed",
      email_next_send_at: emailSequenceId ? now : null,
      sms_sequence_id: smsSequenceId,
      sms_current_step: 0,
      sms_status: smsSequenceId ? "active" : "completed",
      sms_next_send_at: smsSequenceId ? fifteenMinutesFromNow : null,
    })
    .select()
    .single();

  if (insertError || !journey) {
    throw new Error(
      `[journey-manager] Failed to create journey: ${insertError?.message ?? "unknown error"}`
    );
  }

  // Log enrollment event
  await supabase.from("pipeline_events").insert({
    contact_id: contactId,
    funnel_id: funnelId,
    event_type: "journey_enrolled",
    event_data: {
      journey_id: journey.id,
      email_sequence_id: emailSequenceId,
      sms_sequence_id: smsSequenceId,
    },
  });

  return journey as unknown as JourneyRecord;
}

// ---------------------------------------------------------------------------
// Pause / Resume / Complete / Exit
// ---------------------------------------------------------------------------

/**
 * Pause both email and SMS channels on a journey.
 * The journey remembers where it left off so it can be resumed.
 */
export async function pauseJourney(journeyId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("contact_journeys")
    .update({
      email_status: "paused",
      sms_status: "paused",
    })
    .eq("id", journeyId);

  if (error) {
    throw new Error(
      `[journey-manager] Failed to pause journey ${journeyId}: ${error.message}`
    );
  }
}

/**
 * Resume a paused journey. Sets both channels back to active and
 * recalculates the next send times so they fire on the next processor run.
 */
export async function resumeJourney(journeyId: string): Promise<void> {
  const supabase = createAdminClient();

  // Load the journey to check current state
  const { data: journey, error: loadError } = await supabase
    .from("contact_journeys")
    .select("*")
    .eq("id", journeyId)
    .single();

  if (loadError || !journey) {
    throw new Error(
      `[journey-manager] Cannot load journey ${journeyId}: ${loadError?.message ?? "not found"}`
    );
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {};

  // Only resume channels that were paused (don't re-activate completed ones)
  if (journey.email_status === "paused") {
    updates.email_status = "active";
    updates.email_next_send_at = now; // Fire on next processor run
  }
  if (journey.sms_status === "paused") {
    updates.sms_status = "active";
    updates.sms_next_send_at = now;
  }

  if (Object.keys(updates).length === 0) {
    return; // Nothing to resume
  }

  const { error } = await supabase
    .from("contact_journeys")
    .update(updates)
    .eq("id", journeyId);

  if (error) {
    throw new Error(
      `[journey-manager] Failed to resume journey ${journeyId}: ${error.message}`
    );
  }
}

/**
 * Mark a journey as completed (e.g., the contact converted or booked).
 */
export async function completeJourney(
  journeyId: string,
  reason: string = "converted"
): Promise<void> {
  const supabase = createAdminClient();

  const { data: journey } = await supabase
    .from("contact_journeys")
    .select("contact_id, funnel_id")
    .eq("id", journeyId)
    .single();

  const { error } = await supabase
    .from("contact_journeys")
    .update({
      email_status: "completed",
      sms_status: "completed",
      completed_at: new Date().toISOString(),
      completion_reason: reason,
    })
    .eq("id", journeyId);

  if (error) {
    throw new Error(
      `[journey-manager] Failed to complete journey ${journeyId}: ${error.message}`
    );
  }

  // Log completion event
  if (journey) {
    await supabase.from("pipeline_events").insert({
      contact_id: journey.contact_id,
      funnel_id: journey.funnel_id,
      event_type: "journey_completed",
      event_data: { journey_id: journeyId, reason },
    });
  }
}

/**
 * Exit a journey early (unsubscribe, invalid contact, manual removal).
 */
export async function exitJourney(journeyId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: journey } = await supabase
    .from("contact_journeys")
    .select("contact_id, funnel_id")
    .eq("id", journeyId)
    .single();

  const { error } = await supabase
    .from("contact_journeys")
    .update({
      email_status: "exited",
      sms_status: "exited",
      completed_at: new Date().toISOString(),
      completion_reason: "exited",
    })
    .eq("id", journeyId);

  if (error) {
    throw new Error(
      `[journey-manager] Failed to exit journey ${journeyId}: ${error.message}`
    );
  }

  if (journey) {
    await supabase.from("pipeline_events").insert({
      contact_id: journey.contact_id,
      funnel_id: journey.funnel_id,
      event_type: "journey_exited",
      event_data: { journey_id: journeyId },
    });
  }
}

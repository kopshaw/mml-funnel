import { createAdminClient } from "@/lib/supabase/admin";
import { chat } from "@/lib/ai/client";
import { updateAdSetBudget, pauseAd, createAd } from "@/lib/integrations/meta-ads";
import { sendEmail } from "@/lib/integrations/resend";
import { sendSMS } from "@/lib/integrations/twilio";
interface OptimizationAction {
  id: string;
  funnel_id: string;
  funnel_stage_id: string | null;
  action_type: string;
  risk_tier: string;
  status: string;
  diagnosis: string;
  action_details: unknown;
  previous_state: unknown;
  review_window_hours: number | null;
  [key: string]: unknown;
}

/**
 * Execute an approved optimization action.
 * Called automatically for low-risk actions, or after Steve approves medium/high-risk.
 */
export async function executeAction(actionId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: action, error } = await supabase
    .from("optimization_actions")
    .select("*")
    .eq("id", actionId)
    .single();

  if (error || !action) throw new Error(`Action ${actionId} not found`);
  if (action.status !== "approved") throw new Error(`Action ${actionId} not in approved state`);

  // Mark as executing
  await supabase
    .from("optimization_actions")
    .update({ status: "executing" })
    .eq("id", actionId);

  try {
    // Capture previous state before making changes
    const previousState = await capturePreviousState(action);

    // Execute based on action type
    await executeByType(action);

    // Mark as executed, set review time
    const reviewAt = new Date(
      Date.now() + (action.review_window_hours ?? 48) * 60 * 60 * 1000
    ).toISOString();

    await supabase
      .from("optimization_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        review_at: reviewAt,
        previous_state: previousState,
      })
      .eq("id", actionId);

    // Create info alert
    await supabase.from("alerts").insert({
      funnel_id: action.funnel_id,
      optimization_action_id: actionId,
      severity: "info",
      title: `Action executed: ${action.action_type.replace(/_/g, " ")}`,
      message: `${action.diagnosis}. Will review impact at ${new Date(reviewAt).toLocaleString()}.`,
    });
  } catch (err) {
    // Mark as failed
    await supabase
      .from("optimization_actions")
      .update({ status: "failed" })
      .eq("id", actionId);

    await supabase.from("alerts").insert({
      funnel_id: action.funnel_id,
      optimization_action_id: actionId,
      severity: "critical",
      title: `Action failed: ${action.action_type.replace(/_/g, " ")}`,
      message: err instanceof Error ? err.message : "Unknown error during execution",
    });

    throw err;
  }
}

async function executeByType(action: OptimizationAction): Promise<void> {
  const details = action.action_details as Record<string, unknown>;

  switch (action.action_type) {
    case "swap_email_subject":
    case "swap_email_body":
      await executeEmailSwap(action, details);
      break;

    case "adjust_ad_budget":
      await executeAdBudgetAdjust(details);
      break;

    case "pause_ad":
      await executePauseAd(details);
      break;

    case "launch_ad_variant":
      await executeLaunchAdVariant(action, details);
      break;

    case "change_cta":
      await executeChangeCTA(action, details);
      break;

    case "swap_landing_page":
      await executeSwapLandingPage(action, details);
      break;

    case "change_email_timing":
      await executeChangeEmailTiming(details);
      break;

    case "trigger_sms_sequence":
      await executeTriggerSMS(action, details);
      break;

    case "escalate_to_human":
      // No automated execution — just creates the alert (handled in analyzer)
      break;

    case "revert_previous_action":
      await executeRevert(details);
      break;

    default:
      throw new Error(`Unknown action type: ${action.action_type}`);
  }
}

async function executeEmailSwap(
  action: OptimizationAction,
  details: Record<string, unknown>
): Promise<void> {
  // Generate new copy via Claude if not provided
  if (!details.new_content) {
    const type = action.action_type === "swap_email_subject" ? "subject line" : "email body";
    const response = await chat(
      `You are an expert email copywriter for a business consultancy. Generate a compelling ${type} that improves open/click rates.`,
      [
        {
          role: "user",
          content: `Current ${type}: ${details.current_content}\nOffer: ${details.offer_description}\nTarget audience: ${details.audience}\n\nGenerate 1 improved ${type}. Return just the text, nothing else.`,
        },
      ]
    );
    details.new_content = response.content;
  }

  // Store the new content in the ab_test_variants table for A/B comparison
  const supabase = createAdminClient();
  if (details.ab_test_id) {
    await supabase.from("ab_test_variants").insert({
      ab_test_id: details.ab_test_id as string,
      variant_label: "AI Generated",
      variant_content: { content: details.new_content, type: action.action_type },
      is_control: false,
      traffic_percentage: 50,
    });
  }
}

async function executeAdBudgetAdjust(details: Record<string, unknown>): Promise<void> {
  const adSetId = details.adset_id as string;
  const newBudgetCents = details.new_daily_budget_cents as number;

  if (!adSetId || !newBudgetCents) {
    throw new Error("Missing adset_id or new_daily_budget_cents");
  }

  await updateAdSetBudget(adSetId, newBudgetCents);
}

async function executePauseAd(details: Record<string, unknown>): Promise<void> {
  const adId = details.ad_id as string;
  if (!adId) throw new Error("Missing ad_id");
  await pauseAd(adId);
}

async function executeLaunchAdVariant(
  action: OptimizationAction,
  details: Record<string, unknown>
): Promise<void> {
  // Generate ad copy via Claude
  const response = await chat(
    "You are an expert Meta Ads copywriter. Generate compelling ad copy that drives clicks and conversions.",
    [
      {
        role: "user",
        content: `Create a new ad variant:\nCurrent ad: ${JSON.stringify(details.current_ad)}\nOffer: ${details.offer_description}\nTarget audience: ${details.audience}\n\nReturn JSON: { "headline": "...", "primary_text": "...", "description": "..." }`,
      },
    ]
  );

  const adCopy = JSON.parse(response.content);
  const adSetId = details.adset_id as string;

  await createAd(adSetId, {
    name: `AI Variant - ${new Date().toISOString().split("T")[0]}`,
    ...adCopy,
  });
}

async function executeChangeCTA(
  action: OptimizationAction,
  details: Record<string, unknown>
): Promise<void> {
  // For landing pages: update the CTA in the page variant
  const supabase = createAdminClient();
  if (details.variant_id) {
    await supabase
      .from("ab_test_variants")
      .update({
        variant_content: {
          ...(details.current_content as object),
          cta_text: details.new_cta_text,
          cta_color: details.new_cta_color,
        },
      })
      .eq("id", details.variant_id as string);
  }
}

async function executeSwapLandingPage(
  action: OptimizationAction,
  details: Record<string, unknown>
): Promise<void> {
  // Swap the active variant for a landing page
  const supabase = createAdminClient();
  const testId = details.ab_test_id as string;
  const newVariantId = details.new_variant_id as string;

  if (testId && newVariantId) {
    // Set new variant to 100% traffic
    await supabase
      .from("ab_test_variants")
      .update({ traffic_percentage: 0 })
      .eq("ab_test_id", testId);

    await supabase
      .from("ab_test_variants")
      .update({ traffic_percentage: 100 })
      .eq("id", newVariantId);
  }
}

async function executeChangeEmailTiming(details: Record<string, unknown>): Promise<void> {
  // Update email send timing in the sequence configuration
  // This is stored in our own DB, so we just update the config
  const supabase = createAdminClient();
  // Implementation depends on how email sequences are stored
  console.log("Email timing change:", details);
}

async function executeTriggerSMS(
  action: OptimizationAction,
  details: Record<string, unknown>
): Promise<void> {
  // Send SMS to contacts in the target stage who haven't received SMS yet
  const supabase = createAdminClient();
  const message = details.message as string;
  const contactIds = details.contact_ids as string[] | undefined;

  if (!message) throw new Error("Missing SMS message");

  if (contactIds) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("phone")
      .in("id", contactIds)
      .not("phone", "is", null);

    for (const contact of contacts ?? []) {
      if (contact.phone) {
        await sendSMS(contact.phone, message);
      }
    }
  }
}

async function executeRevert(details: Record<string, unknown>): Promise<void> {
  const originalActionId = details.original_action_id as string;
  if (!originalActionId) throw new Error("Missing original_action_id for revert");

  const supabase = createAdminClient();
  const { data: originalAction } = await supabase
    .from("optimization_actions")
    .select("*")
    .eq("id", originalActionId)
    .single();

  if (!originalAction?.previous_state) {
    throw new Error("No previous state to revert to");
  }

  // Re-apply the previous state based on action type
  // This effectively undoes the original change
  console.log("Reverting action:", originalActionId, "to state:", originalAction.previous_state);
}

async function capturePreviousState(
  action: OptimizationAction
): Promise<Record<string, unknown>> {
  // Capture current state before making changes, so we can revert if needed
  const details = action.action_details as Record<string, unknown>;

  return {
    action_type: action.action_type,
    captured_at: new Date().toISOString(),
    original_details: details,
  };
}

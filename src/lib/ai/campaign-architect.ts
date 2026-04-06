import { createAdminClient } from "@/lib/supabase/admin";
import { chat } from "@/lib/ai/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LandingPageContent {
  headline: string;
  subheadline: string;
  body_html: string;
  cta_text: string;
  form_title: string;
  social_proof_text: string;
  meta_title: string;
  meta_description: string;
}

interface EmailStep {
  step_order: number;
  delay_hours: number;
  subject: string;
  body_html: string;
  body_text: string;
  purpose: string;
}

interface SMSStep {
  step_order: number;
  delay_hours: number;
  message: string;
  purpose: string;
}

interface AdCreative {
  headline: string;
  primary_text: string;
  description: string;
  cta_text: string;
  creative_type: "image" | "video" | "carousel";
  image_brief: string;
}

interface AIAgentPrompt {
  system_prompt: string;
  qualification_criteria: string;
  objection_responses: Record<string, string>;
}

interface FunnelStage {
  stage_name: string;
  stage_type: string;
  stage_order: number;
  baseline_value: number;
  warning_threshold: number;
  critical_threshold: number;
}

export interface GeneratedCampaignContent {
  landing_page: LandingPageContent;
  email_sequence: EmailStep[];
  sms_sequence: SMSStep[];
  ad_creatives: AdCreative[];
  ai_agent_prompt: AIAgentPrompt;
  funnel_stages: FunnelStage[];
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

function buildArchitectPrompt(brief: Record<string, unknown>): string {
  const offerType = brief.offer_type as string;
  const priceDollars = ((brief.offer_price_cents as number) / 100).toFixed(0);

  const testimonials = brief.testimonials as Array<Record<string, string>> | undefined;
  const caseStudies = brief.case_studies as Array<Record<string, string>> | undefined;
  const painPoints = brief.pain_points as string[] | undefined;
  const desiredOutcomes = brief.desired_outcomes as string[] | undefined;
  const offerUSPs = brief.offer_usps as string[] | undefined;
  const offerDeliverables = brief.offer_deliverables as string[] | undefined;

  const testimonialBlock =
    testimonials && testimonials.length > 0
      ? `TESTIMONIALS / SOCIAL PROOF:\n${testimonials
          .map(
            (t, i) =>
              `${i + 1}. "${t.quote || t.text}" — ${t.name || "Client"}${t.result ? ` (Result: ${t.result})` : ""}`
          )
          .join("\n")}`
      : "TESTIMONIALS: None provided — invent realistic but clearly hypothetical proof points based on the offer.";

  const caseStudyBlock =
    caseStudies && caseStudies.length > 0
      ? `CASE STUDIES:\n${caseStudies
          .map(
            (cs, i) =>
              `${i + 1}. ${cs.title || "Case Study"}: ${cs.summary || cs.description || "No details"}`
          )
          .join("\n")}`
      : "";

  const painPointBlock =
    painPoints && painPoints.length > 0
      ? `TARGET PAIN POINTS:\n${painPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
      : "";

  const outcomeBlock =
    desiredOutcomes && desiredOutcomes.length > 0
      ? `DESIRED OUTCOMES:\n${desiredOutcomes.map((o, i) => `${i + 1}. ${o}`).join("\n")}`
      : "";

  const uspBlock =
    offerUSPs && offerUSPs.length > 0
      ? `UNIQUE SELLING PROPOSITIONS:\n${offerUSPs.map((u, i) => `${i + 1}. ${u}`).join("\n")}`
      : "";

  const deliverableBlock =
    offerDeliverables && offerDeliverables.length > 0
      ? `DELIVERABLES:\n${offerDeliverables.map((d, i) => `${i + 1}. ${d}`).join("\n")}`
      : "";

  const qualificationGuidance =
    offerType === "low_ticket"
      ? `This is a LOW-TICKET offer ($${priceDollars}). The AI agent should focus on overcoming objections and pushing directly to purchase. Minimal qualification needed — the price point is the qualifying filter. Use scarcity and urgency.`
      : offerType === "mid_ticket"
        ? `This is a MID-TICKET offer ($${priceDollars}). The AI agent should check for budget awareness, genuine need, and timeline. If qualified, guide them to book a short strategy call. Avoid being too salesy — be consultative.`
        : `This is a HIGH-TICKET offer ($${priceDollars}). The AI agent must perform full BANT qualification: Budget (can they invest at this level?), Authority (are they the decision maker?), Need (do they have a specific, acute problem this solves?), Timeline (ready to act within 30 days?). Only push to book after clear qualification signals.`;

  return `You are a world-class direct response marketer, funnel architect, and conversion copywriter working for Metric Mentor Labs. You have decades of combined experience from the schools of Dan Kennedy, Eugene Schwartz, Gary Halbert, Russell Brunson, and Alex Hormozi.

Your task: Generate ALL content for a complete marketing funnel — from ads to landing page to email nurture to SMS follow-up to AI sales agent instructions. Every piece of content must be ready to deploy with zero editing.

=== CAMPAIGN BRIEF ===

BRAND:
- Name: ${brief.brand_name}
- Voice: ${brief.brand_voice || "Professional, friendly, and authoritative"}
- Website: ${brief.website_url || "N/A"}
- Guidelines: ${brief.brand_guidelines || "None specified"}

OFFER:
- Name: ${brief.offer_name}
- Description: ${brief.offer_description}
- Type: ${offerType} ($${priceDollars})
- Guarantee: ${brief.offer_guarantee || "None specified"}
${uspBlock}
${deliverableBlock}

TARGET AUDIENCE:
- Who: ${brief.target_audience}
- Persona: ${brief.target_persona || "Not specified"}
- Demographics: ${brief.demographics || "Not specified"}
${painPointBlock}
${outcomeBlock}

${testimonialBlock}
${caseStudyBlock}

ADDITIONAL CONTEXT:
- Social Proof: ${brief.social_proof || "None provided"}
- Competitor Info: ${brief.competitor_info || "None provided"}
- Campaign Goal: ${brief.campaign_goal || "Generate qualified leads"}
- Booking URL: ${brief.booking_url || "{{BOOKING_URL}}"}
- Traffic Source: ${brief.traffic_source || "meta_ads"}

=== COPYWRITING FRAMEWORKS ===

Use these proven frameworks throughout:
- PAS (Problem-Agitate-Solution) for landing page and ads
- AIDA (Attention-Interest-Desire-Action) for email sequence arc
- Before/After/Bridge for testimonial-style content
- Objection-Acknowledgment-Reframe for objection handling
- Open loops and curiosity gaps for email subject lines

=== CONTENT REQUIREMENTS ===

1. LANDING PAGE — Generate:
   - headline: A bold, benefit-driven main headline (max 12 words). Use power words. Make them feel seen.
   - subheadline: Supporting line that adds specificity, proof, or urgency (max 25 words).
   - body_html: Full page body in semantic HTML. Include: pain point section, solution reveal, benefits (not features), social proof callout, deliverables list, FAQ-style objection handling, and urgency element. Use <h2>, <p>, <ul>, <li>, <strong>, <em> tags. Make it scannable. Minimum 800 words.
   - cta_text: Primary call-to-action button text (action-oriented, max 6 words).
   - form_title: Heading above the opt-in form (creates desire to fill it out).
   - social_proof_text: A one-liner for above-the-fold social proof (e.g., "Trusted by 500+ businesses" or a micro-testimonial).
   - meta_title: SEO page title (max 60 chars).
   - meta_description: SEO meta description (max 155 chars).

2. EMAIL SEQUENCE — Generate 5-7 emails. Each email must have:
   - step_order: 1 through N
   - delay_hours: Hours after the trigger event (form submission). Email 1 = 0 (immediate). Space them: 0, 4, 24, 48, 72, 120, 168.
   - subject: Compelling subject line. Use curiosity, specificity, or personalization. No clickbait. Max 50 chars.
   - body_html: Full email in HTML. Use <p>, <a>, <strong>, <em>, <br>, <ul>/<li>. Keep paragraphs short (2-3 sentences max). Include a clear CTA in each. Write like a real person, not a corporation.
   - body_text: Plain text version of the email. No HTML tags.
   - purpose: Internal note on the strategic purpose (e.g., "Welcome + deliver lead magnet", "Social proof + urgency", "Final call + scarcity").

   Email sequence arc should follow:
   - Email 1 (immediate): Welcome, deliver the promised value, set expectations
   - Email 2 (4hrs): Quick value-add or tip, build relationship
   - Email 3 (24hrs): Story-driven — share a case study or transformation
   - Email 4 (48hrs): Address the #1 objection head-on
   - Email 5 (72hrs): Social proof dump — testimonials, results, numbers
   - Email 6 (120hrs): Urgency or scarcity play (deadline, limited spots, price increase)
   - Email 7 (168hrs): Final call — "Is this still on your radar?" breakup-style email

3. SMS SEQUENCE — Generate 3-4 SMS messages:
   - step_order: 1 through N
   - delay_hours: Hours after form submission. Space them: 0.1 (6 min), 24, 72, 120.
   - message: The SMS text. MUST be under 160 characters. Conversational, warm, no corporate speak. Use the prospect's first name as {{first_name}}.
   - purpose: Internal strategic note.

4. AD CREATIVES — Generate 3 ad variants for ${brief.traffic_source || "Meta Ads"}:
   - headline: Max 40 chars. Stop the scroll. Be specific about the outcome.
   - primary_text: Max 125 words. Hook in first line. Use the PAS framework. Include a clear CTA.
   - description: Max 30 words. Supporting detail or social proof.
   - cta_text: One of: "Learn More", "Sign Up", "Book Now", "Get Started", "Download", "Apply Now".
   - creative_type: "image" (for all unless video is obviously better).
   - image_brief: Describe the ideal ad image in detail — style, colors, subject, text overlay, mood. Be specific enough for a designer or AI image tool.

   Variant strategy:
   - Variant 1: Pain-point-led (call out the problem directly)
   - Variant 2: Result-led (lead with the transformation/outcome)
   - Variant 3: Social-proof-led (lead with proof and credibility)

5. AI AGENT PROMPT — Generate:
   - system_prompt: A comprehensive prompt for the AI sales agent that handles inbound SMS/email from leads who opt in. Include: persona, tone, qualification flow, key talking points about the offer, objection handling, and when to suggest booking. Write it as if you're training a top sales rep.
   - qualification_criteria: ${qualificationGuidance}
   - objection_responses: An object mapping common objection categories to specific response strategies. Keys: "price", "timing", "trust", "need", "competitor", "authority". Values: The exact framework/script to handle each objection.

6. FUNNEL STAGES — Generate the recommended funnel stages array. Each stage:
   - stage_name: Human-readable name
   - stage_type: One of: ad_impression, ad_click, page_view, page_conversion, email_sent, email_opened, email_clicked, sms_sent, sms_replied, ai_conversation, qualified, booking_made, booking_attended, proposal_sent, closed_won
   - stage_order: Sequential integer starting at 1
   - baseline_value: Expected conversion rate (as decimal, e.g., 0.02 for 2%)
   - warning_threshold: Rate below which triggers a warning (typically 70-80% of baseline)
   - critical_threshold: Rate below which triggers critical alert (typically 50-60% of baseline)

   Include all relevant stages from ad to close for this offer type.

=== OUTPUT FORMAT ===

Respond with a single JSON object with these exact keys:
{
  "landing_page": { ... },
  "email_sequence": [ ... ],
  "sms_sequence": [ ... ],
  "ad_creatives": [ ... ],
  "ai_agent_prompt": { ... },
  "funnel_stages": [ ... ]
}

Write copy that converts. Be specific, not generic. Use the brief data — don't ignore the pain points, USPs, or testimonials provided. Every sentence should earn its place.`;
}

// ---------------------------------------------------------------------------
// Main Generation Function
// ---------------------------------------------------------------------------

/**
 * Load a campaign brief, generate all funnel content via Claude,
 * and store the results back on the brief for review.
 */
export async function generateCampaignContent(
  briefId: string
): Promise<GeneratedCampaignContent> {
  const supabase = createAdminClient();

  // ── 1. Load the brief ──────────────────────────────────────────────────
  const { data: brief, error: loadError } = await supabase
    .from("campaign_briefs")
    .select("*")
    .eq("id", briefId)
    .single();

  if (loadError || !brief) {
    throw new Error(
      `Failed to load campaign brief ${briefId}: ${loadError?.message || "not found"}`
    );
  }

  if (brief.status !== "draft" && brief.status !== "review") {
    throw new Error(
      `Brief ${briefId} is in '${brief.status}' status — only 'draft' or 'review' briefs can be regenerated`
    );
  }

  // ── 2. Mark as generating ──────────────────────────────────────────────
  const { error: statusError } = await supabase
    .from("campaign_briefs")
    .update({ status: "generating" })
    .eq("id", briefId);

  if (statusError) {
    throw new Error(`Failed to update brief status: ${statusError.message}`);
  }

  // ── 3. Call Claude ─────────────────────────────────────────────────────
  const systemPrompt = buildArchitectPrompt(brief);

  let result;
  try {
    result = await chat(
      systemPrompt,
      [
        {
          role: "user",
          content: `Generate the complete funnel content for "${brief.offer_name}" by ${brief.brand_name}. Return a single JSON object with all six top-level keys: landing_page, email_sequence, sms_sequence, ad_creatives, ai_agent_prompt, funnel_stages.`,
        },
      ],
      {
        json: true,
        maxTokens: 16384,
        temperature: 0.7,
      }
    );
  } catch (err) {
    // Revert status on AI failure
    await supabase
      .from("campaign_briefs")
      .update({ status: "draft" })
      .eq("id", briefId);

    throw new Error(
      `AI generation failed: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }

  // ── 4. Parse and validate ──────────────────────────────────────────────
  let generated: GeneratedCampaignContent;
  try {
    generated = JSON.parse(result.content) as GeneratedCampaignContent;
  } catch {
    await supabase
      .from("campaign_briefs")
      .update({ status: "draft" })
      .eq("id", briefId);

    throw new Error("AI returned invalid JSON — generation failed");
  }

  // Basic structural validation
  const requiredKeys: (keyof GeneratedCampaignContent)[] = [
    "landing_page",
    "email_sequence",
    "sms_sequence",
    "ad_creatives",
    "ai_agent_prompt",
    "funnel_stages",
  ];

  for (const key of requiredKeys) {
    if (!generated[key]) {
      await supabase
        .from("campaign_briefs")
        .update({ status: "draft" })
        .eq("id", briefId);

      throw new Error(`AI response missing required key: "${key}"`);
    }
  }

  if (!Array.isArray(generated.email_sequence) || generated.email_sequence.length < 3) {
    await supabase
      .from("campaign_briefs")
      .update({ status: "draft" })
      .eq("id", briefId);

    throw new Error("AI generated fewer than 3 emails — insufficient sequence");
  }

  if (!Array.isArray(generated.sms_sequence) || generated.sms_sequence.length < 2) {
    await supabase
      .from("campaign_briefs")
      .update({ status: "draft" })
      .eq("id", briefId);

    throw new Error("AI generated fewer than 2 SMS messages — insufficient sequence");
  }

  if (!Array.isArray(generated.ad_creatives) || generated.ad_creatives.length < 1) {
    await supabase
      .from("campaign_briefs")
      .update({ status: "draft" })
      .eq("id", briefId);

    throw new Error("AI generated no ad creatives");
  }

  if (!Array.isArray(generated.funnel_stages) || generated.funnel_stages.length < 3) {
    await supabase
      .from("campaign_briefs")
      .update({ status: "draft" })
      .eq("id", briefId);

    throw new Error("AI generated fewer than 3 funnel stages");
  }

  // ── 5. Store generated content ─────────────────────────────────────────
  const { error: saveError } = await supabase
    .from("campaign_briefs")
    .update({
      generated_content: generated,
      generation_model: result.model,
      generated_at: new Date().toISOString(),
      status: "review",
    })
    .eq("id", briefId);

  if (saveError) {
    throw new Error(`Failed to save generated content: ${saveError.message}`);
  }

  return generated;
}

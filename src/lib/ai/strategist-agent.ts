/**
 * Strategist Agent
 *
 * Phase 2 of the multi-agent funnel pipeline.
 *
 * Takes the brief + Research Dossier and produces a Strategy Doc — the
 * blueprint that downstream writer agents will execute. This is where the
 * real marketing thinking happens: Big Idea, positioning, narrative arc,
 * section-by-section outline.
 *
 * Output is pure structure + intent. Word-by-word copy comes later.
 */

import { routedChatJSON } from "@/lib/ai/router";
import type { ResearchDossier } from "@/lib/ai/research-agent";

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

export interface SectionOutline {
  id: string;             // Stable identifier (e.g., "hero", "problem", "guarantee")
  type:
    | "hero"
    | "problem_agitation"
    | "origin_story"
    | "solution_reveal"
    | "how_it_works"
    | "deliverables"
    | "who_its_for"
    | "social_proof"
    | "founder_bio"
    | "comparison_table"
    | "faq"
    | "guarantee"
    | "pricing"
    | "final_cta"
    | "bonus";
  title: string;          // Working title for this section
  intent: string;         // What this section needs to accomplish
  key_points: string[];   // Bullet outline of what to include
  proof_to_use?: string[]; // Specific testimonials/stats to weave in
  estimated_words: number;
}

export interface ShortFormOutline {
  hero_headline: string;       // Working headline
  hero_subheadline: string;    // Working subheadline
  outcome_bullets: string[];   // 3-5 outcome promises (raw, will be polished)
  social_proof_callout: string; // What proof to lead with
  cta_text: string;
}

export interface StrategyDoc {
  /** The 1-sentence Big Idea that the entire funnel rallies around */
  big_idea: string;

  /** The positioning angle vs competitors */
  positioning_angle: string;

  /** Voice & tone instructions, drawn from brand_intel */
  voice_guidelines: {
    tone: string;
    formality: string;
    do_phrases: string[];
    dont_phrases: string[];
  };

  /** Primary promise (the headline-level claim) */
  primary_promise: string;

  /** Supporting promises (bullets, sub-headers) */
  supporting_promises: string[];

  /** The narrative arc — the order in which we move the reader */
  narrative_arc: string;

  /** Long-form sales page section list, in order */
  long_form_outline: SectionOutline[];

  /** Short-form variant blueprint */
  short_form_outline: ShortFormOutline;

  /** Email sequence theme — what arc the 7 emails follow */
  email_arc: {
    overall_theme: string;
    per_email: { step: number; intent: string; key_message: string; delay_hours: number }[];
  };

  /** SMS sequence theme */
  sms_arc: {
    overall_theme: string;
    per_message: { step: number; intent: string; delay_hours: number }[];
  };

  /** Ad strategy */
  ad_strategy: {
    creative_directions: { angle: "pain_led" | "outcome_led" | "proof_led" | "curiosity_led"; hook: string; image_brief: string }[];
  };

  /** AI sales agent persona + qualification */
  sales_agent_brief: {
    persona: string;
    qualification_focus: string;
    top_objections_to_handle: string[];
    when_to_book: string;
  };

  /** Funnel stages this offer needs */
  funnel_stages_recommendation: { stage_name: string; stage_type: string; expected_conversion: number; rationale: string }[];

  /** Strategy summary */
  strategy_summary: string;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildStrategistPrompt(
  brief: Record<string, unknown>,
  dossier: ResearchDossier
): string {
  return `You are a senior direct response marketing strategist for Metric Mentor Labs. Your lineage: Dan Kennedy, Eugene Schwartz, Gary Halbert, Russell Brunson, Alex Hormozi.

Your job: take a campaign brief + research dossier and produce the Strategy Doc that downstream writer agents will execute. This is the blueprint, not the copy. You decide:

1. The BIG IDEA — the unique angle that makes this offer different
2. The POSITIONING — how it sits vs competitors
3. The VOICE — drawn from real brand voice in the dossier
4. The NARRATIVE ARC — the order we move the reader through
5. The SECTION OUTLINE — what every section of the long-form sales page needs to do
6. The SHORT-FORM blueprint — for paid traffic / quick decisions
7. EMAIL + SMS + AD strategy
8. AI sales agent setup

This is high-leverage reasoning. The writers downstream will produce 10x better work if your strategy is sharp.

=== CAMPAIGN BRIEF ===
${JSON.stringify(brief, null, 2)}

=== RESEARCH DOSSIER ===
${JSON.stringify(dossier, null, 2)}

=== STRATEGIC PRINCIPLES (apply these) ===

1. The BIG IDEA should be specific, not generic. "Done in 90 days" beats "Get more leads".
2. Lean into the UNDERUSED angles from the dossier. Avoid the COMMON angles.
3. Use the AUDIENCE'S OWN LANGUAGE — pull phrases from real_pain_quotes, desired_outcome_quotes.
4. The narrative arc must take a SPECIFIC reader (the persona) on a SPECIFIC journey.
5. Every section has ONE job. No section is a filler.
6. Long-form should be 12-15 sections, ~3000-5000 words total.
7. Short-form should be 1 screen of content: hero + 3-5 bullets + 1 testimonial + 1 CTA.
8. Email arc must build emotional momentum — not 7 random emails about the offer.
9. Test angles: pain-led vs outcome-led vs proof-led vs curiosity-led.

=== OUTPUT FORMAT ===

Respond with a single JSON object matching this exact schema:

{
  "big_idea": "1-sentence big idea",
  "positioning_angle": "How this differs from competitors, in 1-2 sentences",
  "voice_guidelines": {
    "tone": "...",
    "formality": "...",
    "do_phrases": ["..."],
    "dont_phrases": ["..."]
  },
  "primary_promise": "The headline-level claim",
  "supporting_promises": ["..."],
  "narrative_arc": "Brief description of the journey we take the reader on",
  "long_form_outline": [
    {
      "id": "hero",
      "type": "hero",
      "title": "...",
      "intent": "...",
      "key_points": ["..."],
      "proof_to_use": ["..."],
      "estimated_words": 50
    },
    {
      "id": "problem",
      "type": "problem_agitation",
      "title": "...",
      "intent": "...",
      "key_points": ["..."],
      "estimated_words": 350
    }
    // ...12-15 sections total
  ],
  "short_form_outline": {
    "hero_headline": "...",
    "hero_subheadline": "...",
    "outcome_bullets": ["...", "...", "..."],
    "social_proof_callout": "...",
    "cta_text": "..."
  },
  "email_arc": {
    "overall_theme": "...",
    "per_email": [
      { "step": 1, "intent": "...", "key_message": "...", "delay_hours": 0 },
      { "step": 2, "intent": "...", "key_message": "...", "delay_hours": 4 }
      // ... 5-7 emails
    ]
  },
  "sms_arc": {
    "overall_theme": "...",
    "per_message": [
      { "step": 1, "intent": "...", "delay_hours": 0.1 },
      { "step": 2, "intent": "...", "delay_hours": 24 }
      // ... 3-4 messages
    ]
  },
  "ad_strategy": {
    "creative_directions": [
      { "angle": "pain_led", "hook": "...", "image_brief": "..." },
      { "angle": "outcome_led", "hook": "...", "image_brief": "..." },
      { "angle": "proof_led", "hook": "...", "image_brief": "..." }
    ]
  },
  "sales_agent_brief": {
    "persona": "...",
    "qualification_focus": "...",
    "top_objections_to_handle": ["..."],
    "when_to_book": "..."
  },
  "funnel_stages_recommendation": [
    { "stage_name": "...", "stage_type": "ad_impression|ad_click|page_view|page_conversion|email_sent|email_opened|email_clicked|sms_sent|sms_replied|ai_conversation|qualified|booking_made|booking_attended|proposal_sent|closed_won", "expected_conversion": 0.05, "rationale": "..." }
  ],
  "strategy_summary": "3-4 sentence executive summary"
}

Be specific. Use the dossier's real audience phrases in your outlines. Don't write the actual copy — write what each section needs to accomplish so the writer can execute.`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runStrategistAgent(
  brief: Record<string, unknown>,
  dossier: ResearchDossier,
  options: { clientId?: string; funnelId?: string } = {}
): Promise<{ strategy: StrategyDoc; costCents: number; model: string }> {
  const systemPrompt = buildStrategistPrompt(brief, dossier);

  const { data, meta } = await routedChatJSON<StrategyDoc>(
    "strategist",
    systemPrompt,
    [
      {
        role: "user",
        content:
          "Produce the Strategy Doc. Use the dossier — quote real audience language. Pick the underused angles. Make the narrative arc specific to this persona.",
      },
    ],
    {
      maxTokens: 8192,
      temperature: 0.6,
      clientId: options.clientId,
      funnelId: options.funnelId,
      operation: "strategist",
    }
  );

  // Validate minimum requirements
  if (!data.big_idea || !data.long_form_outline || data.long_form_outline.length < 8) {
    throw new Error(
      `Strategist returned insufficient strategy: big_idea=${!!data.big_idea}, long_form_sections=${data.long_form_outline?.length ?? 0}`
    );
  }

  return { strategy: data, costCents: meta.costCents, model: meta.model };
}

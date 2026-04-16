/**
 * Copywriter Agents
 *
 * Phase 3 of the multi-agent pipeline. Takes the Strategy Doc and writes
 * the actual copy:
 *
 * - Long-form sections (each section is its own focused Claude call)
 * - Short-form variant
 * - Email sequence
 * - SMS sequence
 * - Ad creatives
 * - AI sales agent prompt
 *
 * Uses the cheap-fast Haiku/GPT-4o-mini tier for high-volume copywriting
 * — the strategy is already locked in, this is execution.
 */

import { routedChatJSON } from "@/lib/ai/router";
import type { ResearchDossier } from "@/lib/ai/research-agent";
import type { StrategyDoc, SectionOutline } from "@/lib/ai/strategist-agent";

// ---------------------------------------------------------------------------
// Output types — these get stored in generated_content.long_form / short_form / etc.
// ---------------------------------------------------------------------------

export interface RenderedSection {
  id: string;
  type: SectionOutline["type"];
  title: string;
  /** HTML content — can include <h2>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>, <table> */
  body_html: string;
  /** Raw text version for previews / AI parsing */
  body_text: string;
  /** Optional CTA at end of section */
  cta?: { text: string; type: "primary" | "secondary" };
  /** Word count (for QA) */
  word_count: number;
}

export interface LongFormPage {
  meta_title: string;
  meta_description: string;
  hero: {
    headline: string;
    subheadline: string;
    cta_text: string;
    social_proof_callout?: string;
  };
  sections: RenderedSection[];
  total_word_count: number;
}

export interface ShortFormPage {
  meta_title: string;
  meta_description: string;
  hero: {
    headline: string;
    subheadline: string;
    cta_text: string;
  };
  outcome_bullets: { icon_hint: string; text: string }[];
  social_proof: { quote: string; attribution: string };
  closing_cta: { text: string; reassurance: string };
}

export interface EmailStep {
  step_order: number;
  delay_hours: number;
  subject: string;
  preview_text: string;
  body_html: string;
  body_text: string;
  purpose: string;
}

export interface SMSStep {
  step_order: number;
  delay_hours: number;
  message: string;
  purpose: string;
}

export interface AdCreative {
  variant_label: string;
  angle: string;
  headline: string;
  primary_text: string;
  description: string;
  cta_text: string;
  creative_type: "image" | "video" | "carousel";
  image_brief: string;
}

export interface AIAgentPrompt {
  system_prompt: string;
  qualification_criteria: string;
  objection_responses: Record<string, string>;
  booking_signals: string[];
}

// ---------------------------------------------------------------------------
// Helper: shared context for every copy task
// ---------------------------------------------------------------------------

function contextBlock(strategy: StrategyDoc, dossier: ResearchDossier): string {
  return `=== STRATEGY (locked in — execute it) ===
Big Idea: ${strategy.big_idea}
Positioning: ${strategy.positioning_angle}
Primary Promise: ${strategy.primary_promise}

=== VOICE GUIDELINES ===
Tone: ${strategy.voice_guidelines.tone}
Formality: ${strategy.voice_guidelines.formality}
DO use these phrases: ${strategy.voice_guidelines.do_phrases.join(", ")}
DON'T use these phrases: ${strategy.voice_guidelines.dont_phrases.join(", ")}

=== AUDIENCE LANGUAGE (use these real quotes) ===
Real pain quotes: ${dossier.audience_intel.real_pain_quotes.slice(0, 5).join(" | ")}
Real outcome quotes: ${dossier.audience_intel.desired_outcome_quotes.slice(0, 5).join(" | ")}

=== AVOID THESE WORN-OUT PHRASES ===
${dossier.recommendations.avoid_phrases.join(", ")}

=== EMBRACE THESE FRESH PHRASES ===
${dossier.recommendations.embrace_phrases.join(", ")}`;
}

// ---------------------------------------------------------------------------
// Section writer — one call per section for depth
// ---------------------------------------------------------------------------

async function writeSection(
  outline: SectionOutline,
  strategy: StrategyDoc,
  dossier: ResearchDossier,
  brief: Record<string, unknown>,
  options: { clientId?: string; funnelId?: string } = {}
): Promise<RenderedSection> {
  const systemPrompt = `You are a world-class direct response copywriter. You're writing ONE section of a long-form sales page. Your job is to execute the strategy, not invent it.

${contextBlock(strategy, dossier)}

=== THIS SECTION ===
Section Type: ${outline.type}
Title: ${outline.title}
Intent: ${outline.intent}
Key Points to Cover:
${outline.key_points.map((p, i) => `${i + 1}. ${p}`).join("\n")}
${outline.proof_to_use && outline.proof_to_use.length > 0 ? `\nSpecific Proof to Weave In:\n${outline.proof_to_use.join("\n")}` : ""}
Target Word Count: ~${outline.estimated_words} words

=== OFFER REMINDER ===
${brief.offer_name}: ${brief.offer_description}
Price: $${((brief.offer_price_cents as number) / 100).toFixed(0)}

=== HTML RULES ===
- Use semantic HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>
- For comparison_table type: use <table>, <thead>, <tbody>, <tr>, <th>, <td>
- For faq type: use <details><summary>...</summary><p>...</p></details>
- For pricing type: use a clear card-like structure
- Short paragraphs (2-3 sentences max)
- Specific > generic. Concrete > abstract.

=== OUTPUT FORMAT ===
{
  "body_html": "...",
  "body_text": "...(plain text version, same content)",
  "cta": { "text": "...", "type": "primary" } // optional, only if section needs one
}

Write the section. Use real audience language. Reference real proof. Make every sentence earn its place.`;

  const { data, meta } = await routedChatJSON<{
    body_html: string;
    body_text: string;
    cta?: { text: string; type: "primary" | "secondary" };
  }>(
    "section_copy",
    systemPrompt,
    [
      {
        role: "user",
        content: `Write the "${outline.title}" section.`,
      },
    ],
    {
      maxTokens: 4096,
      temperature: 0.7,
      clientId: options.clientId,
      funnelId: options.funnelId,
      operation: `section:${outline.type}`,
    }
  );
  void meta; // cost already logged inside routedChatJSON

  const wordCount = data.body_text.split(/\s+/).filter(Boolean).length;

  return {
    id: outline.id,
    type: outline.type,
    title: outline.title,
    body_html: data.body_html,
    body_text: data.body_text,
    cta: data.cta,
    word_count: wordCount,
  };
}

// ---------------------------------------------------------------------------
// Long-form page generator (parallel sections)
// ---------------------------------------------------------------------------

export async function writeLongFormPage(
  strategy: StrategyDoc,
  dossier: ResearchDossier,
  brief: Record<string, unknown>,
  options: { clientId?: string; funnelId?: string } = {}
): Promise<LongFormPage> {
  // Find hero section in outline (first one, or by type)
  const heroOutline =
    strategy.long_form_outline.find((s) => s.type === "hero") ?? strategy.long_form_outline[0];

  // Hero needs special treatment — short, punchy, headline-driven
  const heroSystemPrompt = `You are a world-class direct response copywriter. Write the HERO section of a long-form sales page.

${contextBlock(strategy, dossier)}

=== HERO REQUIREMENTS ===
- headline: Big, specific, benefit-driven. Max 12 words. Pulls reader in.
- subheadline: Adds specificity, proof, or stakes. Max 25 words.
- cta_text: Action verb + outcome. Max 6 words.
- social_proof_callout: One-liner of proof above the fold (e.g., "Used by 200+ agency owners")
- meta_title: SEO title (max 60 chars).
- meta_description: SEO description (max 155 chars).

=== INTENT ===
${heroOutline.intent}

=== KEY POINTS ===
${heroOutline.key_points.join("\n")}

Output JSON: { "headline": "...", "subheadline": "...", "cta_text": "...", "social_proof_callout": "...", "meta_title": "...", "meta_description": "..." }`;

  const heroPromise = routedChatJSON<{
    headline: string;
    subheadline: string;
    cta_text: string;
    social_proof_callout: string;
    meta_title: string;
    meta_description: string;
  }>(
    "section_copy",
    heroSystemPrompt,
    [{ role: "user", content: "Write the hero." }],
    {
      maxTokens: 1024,
      temperature: 0.7,
      clientId: options.clientId,
      funnelId: options.funnelId,
      operation: "section:hero",
    }
  );

  // Other sections (skip hero — handled separately)
  const otherSectionOutlines = strategy.long_form_outline.filter((s) => s.type !== "hero");

  // Parallel-write all sections (Promise.all = ~5x faster than sequential)
  const sectionPromises = otherSectionOutlines.map((outline) =>
    writeSection(outline, strategy, dossier, brief, options)
  );

  const [heroData, sections] = await Promise.all([
    heroPromise,
    Promise.all(sectionPromises),
  ]);

  const totalWords = sections.reduce((sum, s) => sum + s.word_count, 0);

  return {
    meta_title: heroData.data.meta_title,
    meta_description: heroData.data.meta_description,
    hero: {
      headline: heroData.data.headline,
      subheadline: heroData.data.subheadline,
      cta_text: heroData.data.cta_text,
      social_proof_callout: heroData.data.social_proof_callout,
    },
    sections,
    total_word_count: totalWords,
  };
}

// ---------------------------------------------------------------------------
// Short-form page generator (single call)
// ---------------------------------------------------------------------------

export async function writeShortFormPage(
  strategy: StrategyDoc,
  dossier: ResearchDossier,
  brief: Record<string, unknown>,
  options: { clientId?: string; funnelId?: string } = {}
): Promise<ShortFormPage> {
  const systemPrompt = `You are a world-class direct response copywriter. Write a SHORT-FORM landing page — one screen of content for paid traffic / quick decisions.

${contextBlock(strategy, dossier)}

=== SHORT-FORM BLUEPRINT (from strategy) ===
${JSON.stringify(strategy.short_form_outline, null, 2)}

=== OFFER ===
${brief.offer_name}: ${brief.offer_description}
Price: $${((brief.offer_price_cents as number) / 100).toFixed(0)}

=== STRUCTURE ===
1. Hero: headline + subheadline + CTA
2. Outcome bullets: 3-5 specific outcomes (use icons hints like "clock" "chart-up" "check")
3. Social proof: one strong quote with attribution
4. Closing CTA with reassurance

=== OUTPUT JSON ===
{
  "meta_title": "max 60 chars",
  "meta_description": "max 155 chars",
  "hero": { "headline": "max 12 words", "subheadline": "max 25 words", "cta_text": "max 6 words" },
  "outcome_bullets": [
    { "icon_hint": "clock|chart-up|check|target|shield|rocket|dollar|users", "text": "specific outcome (max 12 words)" }
  ],
  "social_proof": { "quote": "real-sounding quote", "attribution": "name + role/company" },
  "closing_cta": { "text": "...", "reassurance": "no-risk line, e.g. 'Free trial. Cancel anytime.'" }
}

Make every word count. This is one screen — no fluff.`;

  const { data } = await routedChatJSON<ShortFormPage>(
    "section_copy",
    systemPrompt,
    [{ role: "user", content: "Write the short-form page." }],
    {
      maxTokens: 2048,
      temperature: 0.7,
      clientId: options.clientId,
      funnelId: options.funnelId,
      operation: "short_form_page",
    }
  );

  return data;
}

// ---------------------------------------------------------------------------
// Email sequence (parallel per email for depth)
// ---------------------------------------------------------------------------

async function writeOneEmail(
  index: number,
  emailPlan: { step: number; intent: string; key_message: string; delay_hours: number },
  strategy: StrategyDoc,
  dossier: ResearchDossier,
  brief: Record<string, unknown>,
  options: { clientId?: string; funnelId?: string } = {}
): Promise<EmailStep> {
  const systemPrompt = `You are a top-shelf email copywriter. Write ONE email in a nurture sequence.

${contextBlock(strategy, dossier)}

=== EMAIL ARC THEME ===
${strategy.email_arc.overall_theme}

=== THIS EMAIL ===
Step: ${emailPlan.step}
Intent: ${emailPlan.intent}
Key Message: ${emailPlan.key_message}
Delay Hours: ${emailPlan.delay_hours}

=== OFFER REMINDER ===
${brief.offer_name}: ${brief.offer_description}
Price: $${((brief.offer_price_cents as number) / 100).toFixed(0)}
Booking URL placeholder: {{booking_url}}
First name placeholder: {{first_name}}

=== EMAIL RULES ===
- Subject: Curiosity, specificity, OR personalization. Max 50 chars. No clickbait.
- Preview text: First-line hook, max 90 chars.
- Body: Short paragraphs (2-3 sentences). Conversational. Like you're emailing a friend.
- Always one clear CTA — usually a link to booking_url.
- Use {{first_name}} once near the start.
- HTML version uses <p>, <a>, <strong>, <em>, <br> — no inline styles.

=== OUTPUT JSON ===
{
  "subject": "...",
  "preview_text": "...",
  "body_html": "...",
  "body_text": "...(plain text equivalent)",
  "purpose": "1-line strategic note for internal records"
}`;

  const { data } = await routedChatJSON<{
    subject: string;
    preview_text: string;
    body_html: string;
    body_text: string;
    purpose: string;
  }>(
    "email_copy",
    systemPrompt,
    [{ role: "user", content: `Write email ${emailPlan.step}.` }],
    {
      maxTokens: 2048,
      temperature: 0.7,
      clientId: options.clientId,
      funnelId: options.funnelId,
      operation: `email:${emailPlan.step}`,
    }
  );

  return {
    step_order: emailPlan.step,
    delay_hours: emailPlan.delay_hours,
    subject: data.subject,
    preview_text: data.preview_text,
    body_html: data.body_html,
    body_text: data.body_text,
    purpose: data.purpose,
  };
}

export async function writeEmailSequence(
  strategy: StrategyDoc,
  dossier: ResearchDossier,
  brief: Record<string, unknown>,
  options: { clientId?: string; funnelId?: string } = {}
): Promise<EmailStep[]> {
  const promises = strategy.email_arc.per_email.map((plan, i) =>
    writeOneEmail(i, plan, strategy, dossier, brief, options)
  );
  return Promise.all(promises);
}

// ---------------------------------------------------------------------------
// SMS sequence (one call for the whole sequence — they're short)
// ---------------------------------------------------------------------------

export async function writeSMSSequence(
  strategy: StrategyDoc,
  dossier: ResearchDossier,
  brief: Record<string, unknown>,
  options: { clientId?: string; funnelId?: string } = {}
): Promise<SMSStep[]> {
  const systemPrompt = `You are a conversational SMS copywriter. Write a sequence of SMS messages for a nurture flow.

${contextBlock(strategy, dossier)}

=== SMS ARC ===
Theme: ${strategy.sms_arc.overall_theme}
Plan:
${JSON.stringify(strategy.sms_arc.per_message, null, 2)}

=== OFFER REMINDER ===
${brief.offer_name}
Booking URL placeholder: {{booking_url}}
First name placeholder: {{first_name}}

=== SMS RULES ===
- Each message under 160 characters
- Conversational, warm, NEVER corporate
- Use {{first_name}} naturally
- Last message often has a soft "no" — "if not, no worries, no more from me"

=== OUTPUT JSON ===
{
  "messages": [
    { "step_order": 1, "delay_hours": 0.1, "message": "...", "purpose": "..." }
    // one entry per planned message
  ]
}`;

  const { data } = await routedChatJSON<{ messages: SMSStep[] }>(
    "section_copy",
    systemPrompt,
    [{ role: "user", content: "Write all SMS messages in the sequence." }],
    {
      maxTokens: 1024,
      temperature: 0.7,
      clientId: options.clientId,
      funnelId: options.funnelId,
      operation: "sms_sequence",
    }
  );

  return data.messages;
}

// ---------------------------------------------------------------------------
// Ads (one call for all variants)
// ---------------------------------------------------------------------------

export async function writeAdCreatives(
  strategy: StrategyDoc,
  dossier: ResearchDossier,
  brief: Record<string, unknown>,
  options: { clientId?: string; funnelId?: string } = {}
): Promise<AdCreative[]> {
  const systemPrompt = `You write Meta/Google ads that get clicks. Generate ad creatives for the directions in the strategy.

${contextBlock(strategy, dossier)}

=== AD STRATEGY ===
${JSON.stringify(strategy.ad_strategy, null, 2)}

=== OFFER ===
${brief.offer_name}: ${brief.offer_description}

=== AD RULES ===
- headline: Max 40 chars. Stop the scroll.
- primary_text: Max 125 words. PAS framework. Hook first line.
- description: Max 30 words. Supporting proof or detail.
- cta_text: One of: "Learn More", "Sign Up", "Book Now", "Get Started", "Download", "Apply Now"
- creative_type: "image" unless video is obviously better
- image_brief: Specific design brief — style, colors, subject, mood, text overlay

=== OUTPUT JSON ===
{
  "ads": [
    { "variant_label": "Pain-led", "angle": "pain_led", "headline": "...", "primary_text": "...", "description": "...", "cta_text": "...", "creative_type": "image", "image_brief": "..." }
    // one per direction in strategy.ad_strategy.creative_directions
  ]
}`;

  const { data } = await routedChatJSON<{ ads: AdCreative[] }>(
    "ad_copy",
    systemPrompt,
    [{ role: "user", content: "Write all ad variants." }],
    {
      maxTokens: 2048,
      temperature: 0.75,
      clientId: options.clientId,
      funnelId: options.funnelId,
      operation: "ad_creatives",
    }
  );

  return data.ads;
}

// ---------------------------------------------------------------------------
// AI sales agent prompt
// ---------------------------------------------------------------------------

export async function writeSalesAgentPrompt(
  strategy: StrategyDoc,
  dossier: ResearchDossier,
  brief: Record<string, unknown>,
  options: { clientId?: string; funnelId?: string } = {}
): Promise<AIAgentPrompt> {
  const systemPrompt = `You configure AI sales agents. Write the system prompt + qualification + objection handling for an agent that handles inbound SMS/email from leads.

${contextBlock(strategy, dossier)}

=== AGENT BRIEF FROM STRATEGY ===
${JSON.stringify(strategy.sales_agent_brief, null, 2)}

=== OFFER ===
${brief.offer_name}: ${brief.offer_description}
Price: $${((brief.offer_price_cents as number) / 100).toFixed(0)}
Type: ${brief.offer_type}

=== OUTPUT JSON ===
{
  "system_prompt": "Full system prompt for the agent — comprehensive, several paragraphs, includes persona, tone, qualification flow, key offer talking points, when to push to booking",
  "qualification_criteria": "Specific criteria to qualify a lead. For high-ticket: BANT. For low-ticket: minimal — buy or don't.",
  "objection_responses": {
    "price": "...",
    "timing": "...",
    "trust": "...",
    "need": "...",
    "competitor": "...",
    "authority": "..."
  },
  "booking_signals": ["..."]  // signals from the conversation that mean "they're ready to book"
}`;

  const { data } = await routedChatJSON<AIAgentPrompt>(
    "section_copy",
    systemPrompt,
    [{ role: "user", content: "Write the agent configuration." }],
    {
      maxTokens: 3072,
      temperature: 0.5,
      clientId: options.clientId,
      funnelId: options.funnelId,
      operation: "sales_agent_prompt",
    }
  );

  return data;
}

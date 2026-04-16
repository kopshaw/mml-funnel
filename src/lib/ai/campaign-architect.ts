/**
 * Campaign Architect — Orchestrator
 *
 * The new multi-agent pipeline:
 *
 *   1. Research Agent     → ResearchDossier (web_search/web_fetch, real data)
 *   2. Strategist Agent   → StrategyDoc (big idea, narrative, outline)
 *   3. Copywriter Agents  → LongFormPage + ShortFormPage + Emails + SMS + Ads + AgentPrompt
 *
 * Both long-form and short-form pages are generated so the launcher can
 * auto-create an A/B test out of the gate.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { runResearchAgent, type ResearchDossier } from "@/lib/ai/research-agent";
import { runStrategistAgent, type StrategyDoc } from "@/lib/ai/strategist-agent";
import {
  writeLongFormPage,
  writeShortFormPage,
  writeEmailSequence,
  writeSMSSequence,
  writeAdCreatives,
  writeSalesAgentPrompt,
  type LongFormPage,
  type ShortFormPage,
  type EmailStep,
  type SMSStep,
  type AdCreative,
  type AIAgentPrompt,
} from "@/lib/ai/copywriter-agent";

// ---------------------------------------------------------------------------
// Final output stored in campaign_briefs.generated_content
// ---------------------------------------------------------------------------

export interface FunnelStage {
  stage_name: string;
  stage_type: string;
  stage_order: number;
  baseline_value: number;
  warning_threshold: number;
  critical_threshold: number;
}

export interface GeneratedCampaignContent {
  // Pipeline outputs (full transparency for review + audit)
  research_dossier: ResearchDossier;
  strategy: StrategyDoc;

  // Final variants for the landing page (A/B tested at launch)
  landing_page_long: LongFormPage;
  landing_page_short: ShortFormPage;

  // Backwards compat: the launcher and renderer expect a `landing_page` key
  // We point this at the long-form by default
  landing_page: {
    headline: string;
    subheadline: string;
    body_html: string;
    cta_text: string;
    form_title: string;
    social_proof_text: string;
    meta_title: string;
    meta_description: string;
  };

  email_sequence: EmailStep[];
  sms_sequence: SMSStep[];
  ad_creatives: AdCreative[];
  ai_agent_prompt: AIAgentPrompt;
  funnel_stages: FunnelStage[];

  // Pipeline meta
  generation_meta: {
    research_cost_cents: number;
    strategy_cost_cents: number;
    research_tool_calls: number;
    research_confidence: string;
    pipeline_version: string;
  };
}

// ---------------------------------------------------------------------------
// Helper: convert strategy stages to launcher-compatible shape
// ---------------------------------------------------------------------------

function buildFunnelStages(strategy: StrategyDoc): FunnelStage[] {
  return strategy.funnel_stages_recommendation.map((s, idx) => {
    const baseline = Math.max(0.005, Math.min(1, s.expected_conversion));
    return {
      stage_name: s.stage_name,
      stage_type: s.stage_type,
      stage_order: idx + 1,
      baseline_value: baseline,
      warning_threshold: baseline * 0.75,
      critical_threshold: baseline * 0.5,
    };
  });
}

// ---------------------------------------------------------------------------
// Helper: render the long-form page into a single HTML string for the
// existing landing_page key (so old renderer keeps working as a fallback).
// ---------------------------------------------------------------------------

function flattenLongFormToLegacyShape(
  longForm: LongFormPage
): GeneratedCampaignContent["landing_page"] {
  const sectionsHtml = longForm.sections
    .map((s) => `<section data-section-type="${s.type}" data-section-id="${s.id}">${s.body_html}</section>`)
    .join("\n\n");

  return {
    headline: longForm.hero.headline,
    subheadline: longForm.hero.subheadline,
    body_html: sectionsHtml,
    cta_text: longForm.hero.cta_text,
    form_title: "Get Started",
    social_proof_text: longForm.hero.social_proof_callout ?? "",
    meta_title: longForm.meta_title,
    meta_description: longForm.meta_description,
  };
}

// ---------------------------------------------------------------------------
// Main: orchestrate the pipeline
// ---------------------------------------------------------------------------

const PIPELINE_VERSION = "v2.0-multi-agent";

export async function generateCampaignContent(
  briefId: string
): Promise<GeneratedCampaignContent> {
  const supabase = createAdminClient();

  // ── 1. Load brief ──────────────────────────────────────────────────────
  const { data: brief, error: loadError } = await supabase
    .from("campaign_briefs")
    .select("*")
    .eq("id", briefId)
    .single();

  if (loadError || !brief) {
    throw new Error(`Failed to load brief ${briefId}: ${loadError?.message ?? "not found"}`);
  }

  if (brief.status !== "draft" && brief.status !== "review") {
    throw new Error(
      `Brief ${briefId} is in '${brief.status}' status — only draft/review can be generated`
    );
  }

  // ── 2. Mark generating ─────────────────────────────────────────────────
  await supabase
    .from("campaign_briefs")
    .update({ status: "generating" })
    .eq("id", briefId);

  const clientId = (brief.client_id as string) || undefined;

  try {
    // ── 3. Research ──────────────────────────────────────────────────────
    console.log(`[architect] Brief ${briefId}: Phase 1 — Research Agent starting`);
    const researchStart = Date.now();
    const { dossier, costCents: researchCost, toolCallCount } = await runResearchAgent(
      brief,
      { clientId }
    );
    console.log(
      `[architect] Research complete: ${toolCallCount} tool calls, $${(researchCost / 100).toFixed(2)}, ${Math.round((Date.now() - researchStart) / 1000)}s`
    );

    // ── 4. Strategy ──────────────────────────────────────────────────────
    console.log(`[architect] Phase 2 — Strategist Agent starting`);
    const strategyStart = Date.now();
    const { strategy, costCents: strategyCost } = await runStrategistAgent(
      brief,
      dossier,
      { clientId }
    );
    console.log(
      `[architect] Strategy complete: ${strategy.long_form_outline.length} sections, $${(strategyCost / 100).toFixed(2)}, ${Math.round((Date.now() - strategyStart) / 1000)}s`
    );
    console.log(`[architect] Big Idea: ${strategy.big_idea}`);

    // ── 5. Copywriting (parallel for speed) ──────────────────────────────
    console.log(`[architect] Phase 3 — Copywriter Agents (parallel)`);
    const copyStart = Date.now();
    const [longForm, shortForm, emails, sms, ads, agentPrompt] = await Promise.all([
      writeLongFormPage(strategy, dossier, brief, { clientId }),
      writeShortFormPage(strategy, dossier, brief, { clientId }),
      writeEmailSequence(strategy, dossier, brief, { clientId }),
      writeSMSSequence(strategy, dossier, brief, { clientId }),
      writeAdCreatives(strategy, dossier, brief, { clientId }),
      writeSalesAgentPrompt(strategy, dossier, brief, { clientId }),
    ]);
    console.log(
      `[architect] Copy complete: long-form ${longForm.total_word_count}w (${longForm.sections.length} sections), short-form, ${emails.length} emails, ${sms.length} SMS, ${ads.length} ads — ${Math.round((Date.now() - copyStart) / 1000)}s`
    );

    // ── 6. Assemble final content ────────────────────────────────────────
    const generated: GeneratedCampaignContent = {
      research_dossier: dossier,
      strategy,
      landing_page_long: longForm,
      landing_page_short: shortForm,
      landing_page: flattenLongFormToLegacyShape(longForm),
      email_sequence: emails,
      sms_sequence: sms,
      ad_creatives: ads,
      ai_agent_prompt: agentPrompt,
      funnel_stages: buildFunnelStages(strategy),
      generation_meta: {
        research_cost_cents: researchCost,
        strategy_cost_cents: strategyCost,
        research_tool_calls: toolCallCount,
        research_confidence: dossier.confidence_level,
        pipeline_version: PIPELINE_VERSION,
      },
    };

    // ── 7. Save ──────────────────────────────────────────────────────────
    const { error: saveError } = await supabase
      .from("campaign_briefs")
      .update({
        generated_content: generated,
        generation_model: PIPELINE_VERSION,
        generated_at: new Date().toISOString(),
        status: "review",
      })
      .eq("id", briefId);

    if (saveError) {
      throw new Error(`Failed to save generated content: ${saveError.message}`);
    }

    return generated;
  } catch (err) {
    // Revert status on failure
    await supabase
      .from("campaign_briefs")
      .update({ status: "draft" })
      .eq("id", briefId);

    throw new Error(
      `Campaign generation failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

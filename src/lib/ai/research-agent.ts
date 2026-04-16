/**
 * Research Agent
 *
 * Phase 1 of the multi-agent funnel pipeline.
 *
 * Takes a campaign brief and produces a Research Dossier — a fact-based
 * document the writer agents will reference. Uses Claude with web_search
 * and web_fetch native tools to:
 *
 *   1. Visit the brand's actual website → capture real voice + positioning
 *   2. Search for competitors in the niche → understand the landscape
 *   3. Find real audience language (Reddit, LinkedIn, forums) → use words
 *      the audience actually uses, not what the LLM imagines they use
 *   4. Pull current data, stats, trends → real proof points
 */

import Anthropic from "@anthropic-ai/sdk";
import { calculateCostCents, MODEL_CATALOG } from "@/lib/ai/router";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Output shape — this becomes input for strategist + writer agents
// ---------------------------------------------------------------------------

export interface ResearchDossier {
  /** The brand's actual voice/positioning from their site */
  brand_intel: {
    real_voice_summary: string;
    current_offers: string[];
    positioning_statement: string;
    notable_pages: { url: string; takeaway: string }[];
    visual_identity_notes: string;
  };

  /** Competitive landscape */
  competitor_intel: {
    direct_competitors: {
      name: string;
      url?: string;
      offer: string;
      pricing_signal?: string;
      key_angle: string;
    }[];
    common_angles: string[];     // What everyone says (avoid these)
    underused_angles: string[];  // What few say (lean into these)
    market_saturation: "low" | "medium" | "high";
  };

  /** Real audience language — exact phrases */
  audience_intel: {
    real_pain_quotes: string[];      // direct quotes from forums/reddit/etc.
    desired_outcome_quotes: string[]; // how they describe what they want
    objection_quotes: string[];       // reasons they don't buy
    where_they_hang_out: string[];    // platforms / communities
    trust_signals_they_value: string[]; // what proof works on them
  };

  /** Trends & proof points */
  market_intel: {
    current_trends: string[];
    citable_stats: { stat: string; source?: string }[];
    seasonal_factors: string;
  };

  /** Recommended big idea / positioning angle */
  recommendations: {
    big_idea: string;
    positioning_angle: string;
    primary_promise: string;
    secondary_promises: string[];
    avoid_phrases: string[];     // Worn-out language
    embrace_phrases: string[];   // Fresh, specific phrases to lean on
  };

  /** Meta */
  research_summary: string;     // Executive summary
  confidence_level: "low" | "medium" | "high";
  research_gaps: string[];      // What couldn't be verified
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildResearchPrompt(brief: Record<string, unknown>): string {
  return `You are a senior marketing research analyst for Metric Mentor Labs. You produce fact-based research dossiers that writers use to craft sales funnels that actually convert.

Your job: Use the web_search and web_fetch tools to gather REAL, SPECIFIC intel about this brand, their market, and their audience. Then synthesize it into a Research Dossier.

This is research, not writing. Your output feeds writer agents downstream. Quality of their output depends entirely on the quality of your facts.

=== CAMPAIGN BRIEF ===

BRAND: ${brief.brand_name}
WEBSITE: ${brief.website_url || "(not provided — search for it)"}
OFFER: ${brief.offer_name} — ${brief.offer_description}
PRICE: $${((brief.offer_price_cents as number) / 100).toFixed(0)} (${brief.offer_type})
TARGET AUDIENCE: ${brief.target_audience}
TARGET PERSONA: ${brief.target_persona || "Not specified"}
PAIN POINTS PROVIDED: ${JSON.stringify(brief.pain_points || [])}
DESIRED OUTCOMES: ${JSON.stringify(brief.desired_outcomes || [])}
SOCIAL PROOF PROVIDED: ${brief.social_proof || "None"}
COMPETITOR INFO PROVIDED: ${brief.competitor_info || "None"}

=== RESEARCH STEPS (DO THESE IN ORDER) ===

STEP 1 — Brand intel:
  - Use web_fetch to visit ${brief.website_url || "the brand's homepage"}.
  - If no URL provided, web_search for "${brief.brand_name}" to find their site.
  - Read their About page, current offers, blog if any.
  - Capture their REAL voice (formal? casual? technical? warm?).
  - Note current offers and how they position them.

STEP 2 — Competitor intel:
  - web_search for direct competitors: "${brief.offer_name} alternatives", "${brief.target_audience} ${brief.offer_type} programs".
  - Identify 3-5 direct competitors and their offers.
  - Visit 1-2 competitor sales pages with web_fetch — what angles do they use?
  - Note what EVERY competitor says (boring), what FEW say (opportunity).

STEP 3 — Audience language intel:
  - web_search for real audience pain in their words. Examples:
    "${brief.target_audience} reddit", "${brief.target_audience} struggling with"
  - Find at least 3 direct quotes from real people in the audience.
  - Capture exact phrases they use to describe pains, desires, objections.

STEP 4 — Market intel:
  - web_search for current data/stats relevant to the offer.
  - Find citable statistics. e.g., "agency owner average revenue", "consulting client retention rates".
  - Note any seasonal/trending factors.

STEP 5 — Synthesize:
  - Pick a Big Idea — the unique angle this campaign should lead with.
  - Recommend specific phrases to embrace (specific, fresh) and avoid (worn-out).

=== OUTPUT FORMAT ===

After completing your research (it's OK to use 5-15 tool calls), respond with a single JSON object matching this exact schema:

{
  "brand_intel": {
    "real_voice_summary": "...",
    "current_offers": ["..."],
    "positioning_statement": "...",
    "notable_pages": [{ "url": "...", "takeaway": "..." }],
    "visual_identity_notes": "..."
  },
  "competitor_intel": {
    "direct_competitors": [{ "name": "...", "url": "...", "offer": "...", "pricing_signal": "...", "key_angle": "..." }],
    "common_angles": ["..."],
    "underused_angles": ["..."],
    "market_saturation": "low|medium|high"
  },
  "audience_intel": {
    "real_pain_quotes": ["..."],
    "desired_outcome_quotes": ["..."],
    "objection_quotes": ["..."],
    "where_they_hang_out": ["..."],
    "trust_signals_they_value": ["..."]
  },
  "market_intel": {
    "current_trends": ["..."],
    "citable_stats": [{ "stat": "...", "source": "..." }],
    "seasonal_factors": "..."
  },
  "recommendations": {
    "big_idea": "...",
    "positioning_angle": "...",
    "primary_promise": "...",
    "secondary_promises": ["..."],
    "avoid_phrases": ["..."],
    "embrace_phrases": ["..."]
  },
  "research_summary": "3-5 sentence executive summary of what you found",
  "confidence_level": "low|medium|high",
  "research_gaps": ["..."]
}

Be specific. Cite URLs. Use real quotes. If you can't verify something, say so in research_gaps rather than inventing.`;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

const RESEARCH_MODEL = "claude-sonnet-4-20250514";

export async function runResearchAgent(
  brief: Record<string, unknown>,
  options: { clientId?: string; funnelId?: string } = {}
): Promise<{ dossier: ResearchDossier; costCents: number; toolCallCount: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set — research agent requires Anthropic for native tools");

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildResearchPrompt(brief);

  // Anthropic server-side web tools. These execute on Anthropic's servers
  // — the model invokes them and the results come back inline in the same
  // response. SDK type definitions don't yet include them so we cast.
  // `max_uses` caps the agent's exploration to control cost.
  // `allowed_callers: ["direct"]` is required for models like Sonnet 4 that
  // don't natively support programmatic tool calling.
  const tools = [
    {
      type: "web_search_20260209",
      name: "web_search",
      max_uses: 8,
      allowed_callers: ["direct"],
    },
    {
      type: "web_fetch_20260309",
      name: "web_fetch",
      max_uses: 6,
      allowed_callers: ["direct"],
    },
  ] as unknown as Anthropic.Tool[];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let toolCallCount = 0;
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Please research this brand and produce the Research Dossier. Use the tools to gather real data — don't rely on training knowledge alone.`,
    },
  ];

  // Two-phase approach:
  //
  //   Phase 1 (research): let the model use web_search/web_fetch as much
  //     as it wants. The model narrates its findings as text.
  //   Phase 2 (synthesis): once Phase 1 ends with no more tool calls,
  //     send a fresh user message asking for the JSON dossier only.
  //
  // We loop on Phase 1 because the model may go through several rounds
  // of tool use before settling. Phase 2 is always a single follow-up.
  let finalContent = "";
  const MAX_RESEARCH_TURNS = 6;
  let researchDone = false;

  for (let turn = 0; turn < MAX_RESEARCH_TURNS && !researchDone; turn++) {
    const response = await client.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      tools,
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    // Count server-side tool invocations for telemetry
    let usedToolsThisTurn = 0;
    for (const block of response.content) {
      const t = (block as { type?: string }).type;
      if (t === "server_tool_use" || t === "tool_use") {
        toolCallCount++;
        usedToolsThisTurn++;
      }
    }

    messages.push({ role: "assistant", content: response.content });

    // If the model used tools this turn, the response has the results
    // baked in — it might want another turn to use more tools. Continue
    // the loop without prompting.
    if (response.stop_reason === "tool_use" || usedToolsThisTurn > 0) {
      // Handle any client-side tool stubs (shouldn't happen with server tools)
      const clientToolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      if (clientToolUses.length > 0) {
        const toolResults: Anthropic.ToolResultBlockParam[] = clientToolUses.map((tu) => ({
          type: "tool_result",
          tool_use_id: tu.id,
          content: "[no client tools available]",
        }));
        messages.push({ role: "user", content: toolResults });
      }
      // Otherwise the server tool results are already in the assistant
      // message, just continue the loop to let the model think more.
      continue;
    }

    // Model ended its turn without using tools — research phase is done.
    researchDone = true;
  }

  // Phase 2: ask for the final JSON dossier
  messages.push({
    role: "user",
    content:
      "Excellent. Now synthesize all of your research into the final Research Dossier. Output ONLY the JSON object matching the schema in the system prompt — no preamble, no markdown fences, no commentary. Start with `{` and end with `}`.",
  });

  const finalResponse = await client.messages.create({
    model: RESEARCH_MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    // No tools on the final call — pure synthesis
    messages,
  });

  totalInputTokens += finalResponse.usage.input_tokens;
  totalOutputTokens += finalResponse.usage.output_tokens;

  const textBlocks = finalResponse.content.filter(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  finalContent = textBlocks.map((b) => b.text).join("");

  if (!finalContent) {
    throw new Error(`Research agent didn't produce a final JSON synthesis`);
  }

  // Strip any markdown fences and parse JSON
  const cleaned = finalContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let dossier: ResearchDossier;
  try {
    dossier = JSON.parse(cleaned) as ResearchDossier;
  } catch (err) {
    throw new Error(
      `Research agent returned invalid JSON. First 300 chars: ${cleaned.slice(0, 300)}`
    );
  }

  const costCents = calculateCostCents(
    MODEL_CATALOG[RESEARCH_MODEL],
    totalInputTokens,
    totalOutputTokens
  );

  // Log usage
  if (options.clientId) {
    try {
      const supabase = createAdminClient();
      await supabase.from("integration_usage").insert({
        client_id: options.clientId,
        integration_type: "anthropic",
        operation: "research_agent",
        units_consumed: totalInputTokens + totalOutputTokens,
        cost_cents: costCents,
        funnel_id: options.funnelId ?? null,
        metadata: {
          model: RESEARCH_MODEL,
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          tool_call_count: toolCallCount,
        },
      });
    } catch (err) {
      console.error("[research-agent] Failed to log usage:", err);
    }
  }

  return { dossier, costCents, toolCallCount };
}

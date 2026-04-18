/**
 * Multi-provider model router.
 *
 * Different tasks need different models. Cheap models (Haiku, GPT-4o-mini,
 * DeepSeek) for high-volume framework-based generation. Premium models
 * (Sonnet, Opus, GPT-4o, o3) for reasoning-heavy decisions.
 *
 * The CFO agent dynamically adjusts the policy based on burn rate and
 * revenue per tenant.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCredentials, type IntegrationType } from "@/lib/integrations/credentials";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Provider = "anthropic" | "openai" | "deepseek";

export interface ModelSpec {
  provider: Provider;
  model: string;
  /** Cost per 1M input tokens, in USD */
  inputCostPer1M: number;
  /** Cost per 1M output tokens, in USD */
  outputCostPer1M: number;
  /** Maximum context window */
  contextWindow: number;
  /** Supports native JSON mode */
  supportsJson: boolean;
  /** Supports tool use (function calling) */
  supportsTools: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  /** Override the default model selection */
  modelOverride?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
  /** Request JSON output */
  json?: boolean;
  /** Tools to give the model (provider-specific format) */
  tools?: unknown[];
  /** Per-tenant client_id for cost tracking */
  clientId?: string;
  /** Funnel ID for usage attribution */
  funnelId?: string;
  /** Operation name for analytics (e.g., "research", "section_copy") */
  operation?: string;
  /** Abort signal */
  signal?: AbortSignal;
}

export interface ChatResult {
  content: string;
  /** Model actually used */
  model: string;
  provider: Provider;
  inputTokens: number;
  outputTokens: number;
  /** Total cost in USD cents (rounded up) */
  costCents: number;
  /** Stop reason (model-specific) */
  stopReason: string | null;
}

// ---------------------------------------------------------------------------
// Model Catalog (prices as of 2026-04, USD per 1M tokens)
// ---------------------------------------------------------------------------

export const MODEL_CATALOG: Record<string, ModelSpec> = {
  // === Anthropic ===
  "claude-opus-4-20250514": {
    provider: "anthropic",
    model: "claude-opus-4-20250514",
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00,
    contextWindow: 200_000,
    supportsJson: true,
    supportsTools: true,
  },
  "claude-sonnet-4-20250514": {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    contextWindow: 200_000,
    supportsJson: true,
    supportsTools: true,
  },
  "claude-haiku-4-5-20251001": {
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    inputCostPer1M: 1.00,
    outputCostPer1M: 5.00,
    contextWindow: 200_000,
    supportsJson: true,
    supportsTools: true,
  },
  "claude-3-haiku-20240307": {
    provider: "anthropic",
    model: "claude-3-haiku-20240307",
    inputCostPer1M: 0.25,
    outputCostPer1M: 1.25,
    contextWindow: 200_000,
    supportsJson: true,
    supportsTools: true,
  },

  // === OpenAI ===
  "gpt-4o": {
    provider: "openai",
    model: "gpt-4o",
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    contextWindow: 128_000,
    supportsJson: true,
    supportsTools: true,
  },
  "gpt-4o-mini": {
    provider: "openai",
    model: "gpt-4o-mini",
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    contextWindow: 128_000,
    supportsJson: true,
    supportsTools: true,
  },

  // === DeepSeek (cheapest serious option) ===
  "deepseek-chat": {
    provider: "deepseek",
    model: "deepseek-chat",
    inputCostPer1M: 0.27,
    outputCostPer1M: 1.10,
    contextWindow: 128_000,
    supportsJson: true,
    supportsTools: true,
  },
};

// ---------------------------------------------------------------------------
// Task Policy — which models are eligible per task type
//
// First entry is preferred. Router falls through if the preferred provider
// isn't configured (no API key) or if the CFO agent has demoted that task.
// ---------------------------------------------------------------------------

export type TaskType =
  | "research"               // Web search + reasoning, needs tool use
  | "strategist"             // Big-idea / positioning reasoning
  | "section_copy"           // Filling a copywriting framework — high volume
  | "email_copy"             // Same — high volume
  | "ad_copy"                // Short, repeated patterns
  | "sales_agent"            // Live conversation, judgment matters
  | "optimization_diagnosis" // High-stakes self-healing decisions
  | "daily_report"           // Summarization
  | "cfo_analysis";          // CFO agent itself

export const TASK_POLICY: Record<TaskType, string[]> = {
  // Reasoning-heavy: prefer Sonnet, fall back to GPT-4o
  research:               ["claude-sonnet-4-20250514", "gpt-4o"],
  strategist:             ["claude-sonnet-4-20250514", "gpt-4o"],

  // Live judgment, real-time: Sonnet (latency + quality balance)
  sales_agent:            ["claude-sonnet-4-20250514", "gpt-4o"],

  // High-stakes optimization decisions: Opus or o3-tier
  optimization_diagnosis: ["claude-opus-4-20250514", "claude-sonnet-4-20250514"],

  // High-volume framework-based: cheapest competent model
  section_copy:           ["claude-haiku-4-5-20251001", "gpt-4o-mini", "deepseek-chat"],
  email_copy:             ["claude-haiku-4-5-20251001", "gpt-4o-mini", "deepseek-chat"],
  ad_copy:                ["claude-haiku-4-5-20251001", "gpt-4o-mini", "deepseek-chat"],

  // Pure summarization: cheapest
  daily_report:           ["claude-haiku-4-5-20251001", "gpt-4o-mini", "deepseek-chat"],

  // CFO needs reasoning over numbers: Sonnet
  cfo_analysis:           ["claude-sonnet-4-20250514", "gpt-4o"],
};

// ---------------------------------------------------------------------------
// Client singletons
// ---------------------------------------------------------------------------

/**
 * Each chat call goes through the credential loader: tenant → env fallback.
 * Clients are cheap to construct so we don't bother caching them (the
 * credential loader has its own cache with TTL).
 */

async function getAnthropicFor(clientId: string | null): Promise<Anthropic> {
  const creds = await getCredentials(clientId, "anthropic");
  if (!creds?.credentials.api_key) {
    throw new Error("Anthropic not configured — set ANTHROPIC_API_KEY or connect via Settings");
  }
  return new Anthropic({ apiKey: creds.credentials.api_key });
}

async function getOpenAIFor(clientId: string | null): Promise<OpenAI> {
  const creds = await getCredentials(clientId, "openai");
  if (!creds?.credentials.api_key) {
    throw new Error("OpenAI not configured — set OPENAI_API_KEY or connect via Settings");
  }
  return new OpenAI({ apiKey: creds.credentials.api_key });
}

async function getDeepSeekFor(clientId: string | null): Promise<OpenAI> {
  const creds = await getCredentials(clientId, "deepseek");
  if (!creds?.credentials.api_key) {
    throw new Error("DeepSeek not configured — set DEEPSEEK_API_KEY or connect via Settings");
  }
  return new OpenAI({ apiKey: creds.credentials.api_key, baseURL: "https://api.deepseek.com/v1" });
}

/**
 * Is there SOME source of credentials (tenant or env) for this provider?
 * Used during model selection to filter out unavailable providers.
 */
async function isProviderConfiguredFor(
  provider: Provider,
  clientId: string | null
): Promise<boolean> {
  const type: IntegrationType = provider;
  const creds = await getCredentials(clientId, type);
  return !!creds?.credentials.api_key;
}

// ---------------------------------------------------------------------------
// Model selection
// ---------------------------------------------------------------------------

/**
 * Pick the best model for a task. Precedence:
 *   1. Explicit override (e.g., caller knows exactly which model they want)
 *   2. CFO-agent policy pin for (client_id, task) — force a specific model
 *   3. CFO-agent demote for (client_id, task) — skip the primary model
 *   4. TASK_POLICY[task] preferred list, filtered by configured providers
 */
export async function selectModel(
  task: TaskType,
  override?: string,
  clientId?: string
): Promise<ModelSpec> {
  const cid = clientId ?? null;

  if (override && MODEL_CATALOG[override]) {
    const spec = MODEL_CATALOG[override];
    if (await isProviderConfiguredFor(spec.provider, cid)) return spec;
  }

  // CFO policy override (pin takes priority over demote)
  if (clientId) {
    const { pin, demote } = await getClientPolicy(clientId, task);

    if (pin && MODEL_CATALOG[pin]) {
      const spec = MODEL_CATALOG[pin];
      if (await isProviderConfiguredFor(spec.provider, cid)) return spec;
    }

    const candidates = TASK_POLICY[task];
    for (const modelKey of candidates) {
      if (demote && modelKey === demote) continue;
      const spec = MODEL_CATALOG[modelKey];
      if (spec && (await isProviderConfiguredFor(spec.provider, cid))) {
        return spec;
      }
    }
  } else {
    const candidates = TASK_POLICY[task];
    for (const modelKey of candidates) {
      const spec = MODEL_CATALOG[modelKey];
      if (spec && (await isProviderConfiguredFor(spec.provider, cid))) {
        return spec;
      }
    }
  }

  // Last resort: any configured model
  for (const spec of Object.values(MODEL_CATALOG)) {
    if (await isProviderConfiguredFor(spec.provider, cid)) return spec;
  }

  throw new Error("No AI provider configured. Set ANTHROPIC_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY or connect one in Settings → Integrations.");
}

/**
 * Returns the CFO-pinned model (if any) and the CFO-demoted model (if any)
 * for a given client + task. Looks at both task-specific and "all tasks"
 * overrides; the task-specific wins.
 */
async function getClientPolicy(
  clientId: string,
  task: TaskType
): Promise<{ pin: string | null; demote: string | null }> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("model_policy_overrides")
      .select("task_type, model_key, kind")
      .eq("client_id", clientId)
      .eq("active", true)
      .or(`task_type.eq.${task},task_type.is.null`);

    if (!data || data.length === 0) return { pin: null, demote: null };

    // Task-specific overrides beat wildcard
    const sorted = [...data].sort((a, b) => {
      if (a.task_type === task && b.task_type !== task) return -1;
      if (b.task_type === task && a.task_type !== task) return 1;
      return 0;
    });

    let pin: string | null = null;
    let demote: string | null = null;

    for (const o of sorted) {
      if (o.kind === "pin" && !pin) pin = o.model_key;
      if ((o.kind === "demote" || o.kind === "promote") && !demote && o.kind === "demote") {
        demote = o.model_key;
      }
    }

    return { pin, demote };
  } catch (err) {
    console.warn("[router] getClientPolicy failed:", err);
    return { pin: null, demote: null };
  }
}

// ---------------------------------------------------------------------------
// Cost calculation
// ---------------------------------------------------------------------------

export function calculateCostCents(
  spec: ModelSpec,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1_000_000) * spec.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * spec.outputCostPer1M;
  // Convert dollars to cents, round up so we never under-charge
  return Math.ceil((inputCost + outputCost) * 100);
}

// ---------------------------------------------------------------------------
// Usage tracking
// ---------------------------------------------------------------------------

async function logUsage(
  spec: ModelSpec,
  result: { inputTokens: number; outputTokens: number; costCents: number },
  options: ChatOptions
): Promise<void> {
  if (!options.clientId) return; // No client = no per-tenant tracking

  try {
    const supabase = createAdminClient();
    await supabase.from("integration_usage").insert({
      client_id: options.clientId,
      integration_type: spec.provider,
      operation: options.operation ?? "chat",
      units_consumed: result.inputTokens + result.outputTokens,
      cost_cents: result.costCents,
      funnel_id: options.funnelId ?? null,
      metadata: {
        model: spec.model,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
      },
    });
  } catch (err) {
    // Usage logging must never break the main flow
    console.error("[router] Failed to log usage:", err);
  }
}

// ---------------------------------------------------------------------------
// Anthropic chat
// ---------------------------------------------------------------------------

async function chatAnthropic(
  spec: ModelSpec,
  systemPrompt: string,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResult> {
  const client = await getAnthropicFor(options.clientId ?? null);

  let finalSystem = systemPrompt;
  if (options.json) {
    finalSystem = `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown fences, no explanation — just the raw JSON object.`;
  }

  const response = await client.messages.create({
    model: spec.model,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature,
    system: finalSystem,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    tools: options.tools as Anthropic.Tool[] | undefined,
  });

  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  const content = textBlocks.map((b) => b.text).join("");

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costCents = calculateCostCents(spec, inputTokens, outputTokens);

  return {
    content,
    model: response.model,
    provider: "anthropic",
    inputTokens,
    outputTokens,
    costCents,
    stopReason: response.stop_reason,
  };
}

// ---------------------------------------------------------------------------
// OpenAI / DeepSeek chat (DeepSeek uses OpenAI-compatible API)
// ---------------------------------------------------------------------------

async function chatOpenAI(
  spec: ModelSpec,
  systemPrompt: string,
  messages: ChatMessage[],
  options: ChatOptions,
  client: OpenAI
): Promise<ChatResult> {
  const fullMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content }) as OpenAI.ChatCompletionMessageParam),
  ];

  const response = await client.chat.completions.create({
    model: spec.model,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature,
    messages: fullMessages,
    response_format: options.json ? { type: "json_object" } : undefined,
  });

  const choice = response.choices[0];
  const content = choice?.message?.content ?? "";

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const costCents = calculateCostCents(spec, inputTokens, outputTokens);

  return {
    content,
    model: response.model,
    provider: spec.provider,
    inputTokens,
    outputTokens,
    costCents,
    stopReason: choice?.finish_reason ?? null,
  };
}

// ---------------------------------------------------------------------------
// JSON fence stripping
// ---------------------------------------------------------------------------

function stripJsonFences(content: string): string {
  let s = content.trim();
  // Remove leading ```json or ``` and trailing ```
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json|JSON)?\s*\n?/, "");
  }
  if (s.endsWith("```")) {
    s = s.replace(/\n?\s*```\s*$/, "");
  }
  // Some models add prose before/after the JSON object — extract the {…}
  // by finding the first { and matching brace depth. Only do this if a
  // simple parse fails on the cleaned string.
  try {
    JSON.parse(s);
    return s;
  } catch {
    const start = s.indexOf("{");
    if (start === -1) return s;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return s.slice(start, i + 1);
      }
    }
    return s; // give up; let parse fail and report
  }
}

// ---------------------------------------------------------------------------
// Public API: routed chat call
// ---------------------------------------------------------------------------

/**
 * Chat with the model best suited for this task. Logs usage and cost
 * automatically when a clientId is provided.
 *
 * If JSON mode fails to parse, automatically retries once with a stricter
 * system prompt. This rescues high-volume parallel calls where one out of
 * many sections sometimes returns malformed JSON.
 */
export async function routedChat(
  task: TaskType,
  systemPrompt: string,
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  const spec = await selectModel(task, options.modelOverride, options.clientId);

  async function callOnce(systemPromptOverride?: string): Promise<ChatResult> {
    const sysPrompt = systemPromptOverride ?? systemPrompt;
    const cid = options.clientId ?? null;
    switch (spec.provider) {
      case "anthropic":
        return chatAnthropic(spec, sysPrompt, messages, options);
      case "openai":
        return chatOpenAI(spec, sysPrompt, messages, options, await getOpenAIFor(cid));
      case "deepseek":
        return chatOpenAI(spec, sysPrompt, messages, options, await getDeepSeekFor(cid));
    }
  }

  let result = await callOnce();

  // Validate JSON if requested. Strip ```json fences first since some
  // models (Haiku, GPT-4o-mini) wrap JSON despite being told not to.
  if (options.json) {
    const cleaned = stripJsonFences(result.content);
    try {
      JSON.parse(cleaned);
      result.content = cleaned;
    } catch (err) {
      // Retry once with a stricter prompt that emphasizes JSON quoting
      const stricterPrompt = `${systemPrompt}

CRITICAL JSON FORMATTING RULES:
- Output ONLY a JSON object — no preamble, no markdown fences, no commentary.
- All string values must be valid JSON: escape every double-quote as \\"
- Escape every backslash as \\\\ and every newline as \\n
- Apostrophes (') do NOT need escaping in JSON strings
- Test mentally: would JSON.parse() accept your output? If not, fix it.`;

      try {
        const retry = await callOnce(stricterPrompt);
        const retryCleaned = stripJsonFences(retry.content);
        JSON.parse(retryCleaned);
        retry.content = retryCleaned;
        result = {
          ...retry,
          inputTokens: result.inputTokens + retry.inputTokens,
          outputTokens: result.outputTokens + retry.outputTokens,
          costCents: result.costCents + retry.costCents,
        };
      } catch (retryErr) {
        await logUsage(spec, result, options);
        throw new Error(
          `${spec.model} returned invalid JSON twice. First error: ${err instanceof Error ? err.message : String(err)}. Last response start: ${(retryErr instanceof Error ? cleaned : cleaned).slice(0, 200)}`
        );
      }
    }
  }

  await logUsage(spec, result, options);

  return result;
}

/**
 * Convenience: routed chat in JSON mode, parsed into T.
 */
export async function routedChatJSON<T>(
  task: TaskType,
  systemPrompt: string,
  messages: ChatMessage[],
  options: Omit<ChatOptions, "json"> = {}
): Promise<{ data: T; meta: Omit<ChatResult, "content"> }> {
  const result = await routedChat(task, systemPrompt, messages, { ...options, json: true });
  const { content, ...meta } = result;
  return { data: JSON.parse(content) as T, meta };
}

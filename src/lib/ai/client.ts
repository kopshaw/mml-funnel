import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  /** Override the default model */
  model?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
  /** Request JSON output — wraps system prompt with format instructions */
  json?: boolean;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface ChatResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 4096;

/** Retry config for rate-limit (429) responses */
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimit =
        error instanceof Anthropic.RateLimitError ||
        (error instanceof Anthropic.APIError && error.status === 429);

      const isOverloaded =
        error instanceof Anthropic.APIError && error.status === 529;

      if ((isRateLimit || isOverloaded) && attempt < retries) {
        // Exponential backoff with jitter
        const delay =
          BASE_DELAY_MS * Math.pow(2, attempt) +
          Math.random() * BASE_DELAY_MS;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  // Unreachable, but satisfies TypeScript
  throw new Error("Retry loop exited unexpectedly");
}

// ---------------------------------------------------------------------------
// Chat wrapper
// ---------------------------------------------------------------------------

/**
 * Send a chat request to Claude with optional structured JSON output.
 *
 * When `options.json` is true the system prompt is augmented with instructions
 * to respond with valid JSON only. The response content is verified to parse
 * as JSON before returning.
 */
export async function chat(
  systemPrompt: string,
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  const client = getClient();

  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  // Augment system prompt for JSON mode
  let finalSystemPrompt = systemPrompt;
  if (options.json) {
    finalSystemPrompt = `${systemPrompt}\n\nIMPORTANT: You must respond with valid JSON only. No markdown fences, no explanation — just the raw JSON object.`;
  }

  const response = await withRetry(() =>
    client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature,
      system: finalSystemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })
  );

  // Extract text from response content blocks
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  const content = textBlocks.map((b) => b.text).join("");

  // Validate JSON if requested
  if (options.json) {
    try {
      JSON.parse(content);
    } catch {
      throw new Error(
        `Claude returned invalid JSON. Response: ${content.slice(0, 200)}...`
      );
    }
  }

  return {
    content,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    stopReason: response.stop_reason,
  };
}

/**
 * Convenience: call `chat` with JSON mode and parse the result into `T`.
 */
export async function chatJSON<T>(
  systemPrompt: string,
  messages: ChatMessage[],
  options: Omit<ChatOptions, "json"> = {}
): Promise<T> {
  const result = await chat(systemPrompt, messages, { ...options, json: true });
  return JSON.parse(result.content) as T;
}

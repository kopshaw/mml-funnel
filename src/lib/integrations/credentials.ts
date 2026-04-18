/**
 * Per-tenant credential loader.
 *
 * Every integration call now accepts an optional clientId. If set, we
 * load the tenant's credentials from client_integrations; otherwise
 * we fall back to process.env (MML's own keys).
 *
 * Credentials are cached in-memory for 60 seconds to avoid hammering
 * the DB on hot paths (e.g. every email send in a sequence).
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type IntegrationType =
  | "anthropic"
  | "openai"
  | "deepseek"
  | "resend"
  | "twilio"
  | "meta_ads"
  | "stripe"
  | "ghl"
  | "unsplash";

export interface ResolvedCredentials {
  /** Where the credentials came from */
  source: "tenant" | "env";
  /** The client id if tenant, null if env */
  client_id: string | null;
  /** Raw credentials JSON — shape is integration-specific */
  credentials: Record<string, string | undefined>;
  /** Non-secret metadata (account IDs, phone numbers, etc.) */
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------
// Cache (per-request safety via short TTL)
// ---------------------------------------------------------------------

interface CacheEntry {
  expires_at: number;
  creds: ResolvedCredentials | null;
}
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

function cacheKey(clientId: string | null, type: IntegrationType): string {
  return `${clientId ?? "env"}:${type}`;
}

// ---------------------------------------------------------------------
// ENV fallback map — what env var(s) to read if no tenant config
// ---------------------------------------------------------------------

function credentialsFromEnv(type: IntegrationType): Record<string, string | undefined> | null {
  switch (type) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY ? { api_key: process.env.ANTHROPIC_API_KEY } : null;
    case "openai":
      return process.env.OPENAI_API_KEY ? { api_key: process.env.OPENAI_API_KEY } : null;
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY ? { api_key: process.env.DEEPSEEK_API_KEY } : null;
    case "resend":
      return process.env.RESEND_API_KEY
        ? {
            api_key: process.env.RESEND_API_KEY,
            from_address: process.env.RESEND_FROM_ADDRESS ?? "onboarding@resend.dev",
          }
        : null;
    case "twilio":
      return process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
        ? {
            account_sid: process.env.TWILIO_ACCOUNT_SID,
            auth_token: process.env.TWILIO_AUTH_TOKEN,
            phone_number: process.env.TWILIO_PHONE_NUMBER ?? "",
          }
        : null;
    case "meta_ads":
      return process.env.META_ACCESS_TOKEN
        ? {
            access_token: process.env.META_ACCESS_TOKEN,
            ad_account_id: process.env.META_AD_ACCOUNT_ID ?? "",
            app_id: process.env.META_APP_ID ?? "",
            app_secret: process.env.META_APP_SECRET ?? "",
          }
        : null;
    case "stripe":
      return process.env.STRIPE_SECRET_KEY
        ? {
            secret_key: process.env.STRIPE_SECRET_KEY,
            publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
            webhook_secret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
          }
        : null;
    case "ghl":
      return process.env.GHL_API_KEY
        ? {
            api_key: process.env.GHL_API_KEY,
            location_id: process.env.GHL_LOCATION_ID ?? "",
          }
        : null;
    case "unsplash":
      return process.env.UNSPLASH_ACCESS_KEY
        ? { access_key: process.env.UNSPLASH_ACCESS_KEY }
        : null;
  }
}

// ---------------------------------------------------------------------
// Public: load credentials for an integration
// ---------------------------------------------------------------------

/**
 * Returns credentials for (client, integration). Cascades:
 *   1. Tenant's client_integrations row (if connected)
 *   2. Process env fallback (MML's keys)
 *   3. null if nothing is configured
 */
export async function getCredentials(
  clientId: string | null,
  type: IntegrationType
): Promise<ResolvedCredentials | null> {
  const key = cacheKey(clientId, type);
  const cached = CACHE.get(key);
  if (cached && cached.expires_at > Date.now()) {
    return cached.creds;
  }

  let resolved: ResolvedCredentials | null = null;

  // Try tenant first
  if (clientId) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("client_integrations")
        .select("credentials, metadata, status")
        .eq("client_id", clientId)
        .eq("integration_type", type)
        .maybeSingle();

      if (data && data.status === "connected" && data.credentials) {
        const creds = data.credentials as Record<string, string | undefined>;
        if (Object.keys(creds).length > 0) {
          resolved = {
            source: "tenant",
            client_id: clientId,
            credentials: creds,
            metadata: (data.metadata as Record<string, unknown>) ?? {},
          };
        }
      }
    } catch (err) {
      console.warn(`[credentials] Failed to load tenant ${type} for ${clientId}:`, err);
    }
  }

  // Fall back to env
  if (!resolved) {
    const envCreds = credentialsFromEnv(type);
    if (envCreds) {
      resolved = {
        source: "env",
        client_id: null,
        credentials: envCreds,
        metadata: {},
      };
    }
  }

  CACHE.set(key, { expires_at: Date.now() + TTL_MS, creds: resolved });
  return resolved;
}

/**
 * Invalidate the cache for a (client, type) pair. Call after updating
 * credentials so the new values take effect immediately.
 */
export function invalidateCredentials(clientId: string | null, type: IntegrationType): void {
  CACHE.delete(cacheKey(clientId, type));
}

/**
 * Invalidate ALL entries for a client. Call when disconnecting a workspace.
 */
export function invalidateAllForClient(clientId: string): void {
  for (const k of CACHE.keys()) {
    if (k.startsWith(`${clientId}:`)) CACHE.delete(k);
  }
}

// ---------------------------------------------------------------------
// Public: set tenant credentials
// ---------------------------------------------------------------------

export async function setTenantCredentials(
  clientId: string,
  type: IntegrationType,
  credentials: Record<string, string>,
  metadata: Record<string, unknown> = {},
  connectedBy?: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("client_integrations")
    .upsert({
      client_id: clientId,
      integration_type: type,
      credentials,
      metadata,
      status: "pending",
      connected_at: new Date().toISOString(),
      connected_by: connectedBy ?? null,
      last_error: null,
    }, { onConflict: "client_id,integration_type" });

  if (error) throw new Error(`Failed to save credentials: ${error.message}`);

  invalidateCredentials(clientId, type);
}

export async function markIntegrationStatus(
  clientId: string,
  type: IntegrationType,
  status: "connected" | "error" | "expired",
  error?: string
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("client_integrations")
    .update({
      status,
      last_validated_at: new Date().toISOString(),
      last_error: error ?? null,
    })
    .eq("client_id", clientId)
    .eq("integration_type", type);

  invalidateCredentials(clientId, type);
}

export async function removeTenantCredentials(
  clientId: string,
  type: IntegrationType
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("client_integrations")
    .update({
      status: "revoked",
      credentials: {},
      disconnected_at: new Date().toISOString(),
    })
    .eq("client_id", clientId)
    .eq("integration_type", type);

  invalidateCredentials(clientId, type);
}

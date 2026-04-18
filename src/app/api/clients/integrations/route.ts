/**
 * Per-tenant integration management API.
 *
 *   GET    /api/clients/integrations?client_id=...       → list integrations (metadata only)
 *   POST   /api/clients/integrations                      → connect (save credentials)
 *   POST   /api/clients/integrations?action=test          → validate credentials live
 *   DELETE /api/clients/integrations?client_id=...&type=... → disconnect
 *
 * Credentials are stored in the client_integrations table (service-role only).
 * This API routes all reads through the admin client and NEVER returns
 * credentials to the frontend.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  setTenantCredentials,
  markIntegrationStatus,
  removeTenantCredentials,
  type IntegrationType,
} from "@/lib/integrations/credentials";

const INTEGRATION_TYPES: readonly IntegrationType[] = [
  "anthropic", "openai", "deepseek", "resend",
  "twilio", "meta_ads", "stripe", "ghl", "unsplash",
];

// ---------------------------------------------------------------------
// Auth helper — must be admin/owner of the target client
// ---------------------------------------------------------------------
async function requireAdmin(
  clientId: string
): Promise<{ user_id: string } | { error: string; status: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("client_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!membership || (membership.role !== "admin" && membership.role !== "owner")) {
    return { error: "Forbidden — admin access required", status: 403 };
  }
  return { user_id: user.id };
}

// ---------------------------------------------------------------------
// GET — list integrations (metadata only, NO credentials returned)
// ---------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const clientId = new URL(request.url).searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  const auth = await requireAdmin(clientId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data } = await admin
    .from("client_integrations")
    .select("integration_type, status, metadata, last_validated_at, last_error, connected_at, disconnected_at")
    .eq("client_id", clientId);

  return NextResponse.json({
    integrations: data ?? [],
    available_types: INTEGRATION_TYPES,
  });
}

// ---------------------------------------------------------------------
// POST — connect (or test)
// ---------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const action = new URL(request.url).searchParams.get("action");

  if (action === "test") {
    return testConnection(request);
  }

  const body = (await request.json()) as {
    client_id?: string;
    integration_type?: IntegrationType;
    credentials?: Record<string, string>;
    metadata?: Record<string, unknown>;
  };

  const { client_id, integration_type, credentials, metadata = {} } = body;

  if (!client_id || !integration_type || !credentials) {
    return NextResponse.json(
      { error: "client_id, integration_type, and credentials required" },
      { status: 400 }
    );
  }

  if (!INTEGRATION_TYPES.includes(integration_type)) {
    return NextResponse.json(
      { error: `Invalid integration_type: ${integration_type}` },
      { status: 400 }
    );
  }

  const auth = await requireAdmin(client_id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Save
  try {
    await setTenantCredentials(
      client_id,
      integration_type,
      credentials,
      metadata,
      auth.user_id
    );

    // Validate live
    const testResult = await validateCredentials(integration_type, credentials);

    await markIntegrationStatus(
      client_id,
      integration_type,
      testResult.ok ? "connected" : "error",
      testResult.ok ? undefined : testResult.error
    );

    return NextResponse.json({
      ok: testResult.ok,
      status: testResult.ok ? "connected" : "error",
      error: testResult.ok ? null : testResult.error,
      message: testResult.ok
        ? `${integration_type} connected and validated.`
        : `Saved, but validation failed: ${testResult.error}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 }
    );
  }
}

async function testConnection(request: NextRequest) {
  const body = (await request.json()) as {
    client_id?: string;
    integration_type?: IntegrationType;
  };
  const { client_id, integration_type } = body;
  if (!client_id || !integration_type) {
    return NextResponse.json({ error: "client_id and integration_type required" }, { status: 400 });
  }

  const auth = await requireAdmin(client_id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Load saved credentials
  const admin = createAdminClient();
  const { data } = await admin
    .from("client_integrations")
    .select("credentials")
    .eq("client_id", client_id)
    .eq("integration_type", integration_type)
    .maybeSingle();

  if (!data?.credentials) {
    return NextResponse.json({ ok: false, error: "Not configured" });
  }

  const result = await validateCredentials(
    integration_type,
    data.credentials as Record<string, string>
  );

  await markIntegrationStatus(
    client_id,
    integration_type,
    result.ok ? "connected" : "error",
    result.ok ? undefined : result.error
  );

  return NextResponse.json({ ok: result.ok, error: result.ok ? null : result.error });
}

// ---------------------------------------------------------------------
// DELETE — disconnect
// ---------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const type = url.searchParams.get("type") as IntegrationType | null;

  if (!clientId || !type) {
    return NextResponse.json({ error: "client_id and type required" }, { status: 400 });
  }

  const auth = await requireAdmin(clientId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await removeTenantCredentials(clientId, type);
  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------
// Per-type validators (fire a cheap API call to confirm creds work)
// ---------------------------------------------------------------------

async function validateCredentials(
  type: IntegrationType,
  creds: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    switch (type) {
      case "anthropic":
        return await validateAnthropic(creds.api_key);
      case "openai":
        return await validateOpenAI(creds.api_key);
      case "deepseek":
        return await validateDeepSeek(creds.api_key);
      case "resend":
        return await validateResend(creds.api_key);
      case "twilio":
        return await validateTwilio(creds.account_sid, creds.auth_token);
      case "unsplash":
        return await validateUnsplash(creds.access_key);
      case "meta_ads":
        return await validateMeta(creds.access_token);
      case "stripe":
        return await validateStripe(creds.secret_key);
      case "ghl":
        return { ok: true }; // TODO: validate GHL
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function validateAnthropic(apiKey?: string) {
  if (!apiKey) return { ok: false as const, error: "api_key required" };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 4,
      messages: [{ role: "user", content: "hi" }],
    }),
  });
  if (r.ok) return { ok: true as const };
  const body = await r.text();
  return { ok: false as const, error: `${r.status}: ${body.slice(0, 150)}` };
}

async function validateOpenAI(apiKey?: string) {
  if (!apiKey) return { ok: false as const, error: "api_key required" };
  const r = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return r.ok
    ? { ok: true as const }
    : { ok: false as const, error: `${r.status}: ${(await r.text()).slice(0, 150)}` };
}

async function validateDeepSeek(apiKey?: string) {
  if (!apiKey) return { ok: false as const, error: "api_key required" };
  const r = await fetch("https://api.deepseek.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return r.ok
    ? { ok: true as const }
    : { ok: false as const, error: `${r.status}` };
}

async function validateResend(apiKey?: string) {
  if (!apiKey) return { ok: false as const, error: "api_key required" };
  const r = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return r.ok
    ? { ok: true as const }
    : { ok: false as const, error: `${r.status}: ${(await r.text()).slice(0, 150)}` };
}

async function validateTwilio(sid?: string, token?: string) {
  if (!sid || !token) return { ok: false as const, error: "account_sid and auth_token required" };
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return r.ok
    ? { ok: true as const }
    : { ok: false as const, error: `${r.status}` };
}

async function validateUnsplash(key?: string) {
  if (!key) return { ok: false as const, error: "access_key required" };
  const r = await fetch("https://api.unsplash.com/photos/random?count=1", {
    headers: { Authorization: `Client-ID ${key}` },
  });
  return r.ok
    ? { ok: true as const }
    : { ok: false as const, error: `${r.status}` };
}

async function validateMeta(accessToken?: string) {
  if (!accessToken) return { ok: false as const, error: "access_token required" };
  const r = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${accessToken}`);
  return r.ok
    ? { ok: true as const }
    : { ok: false as const, error: `${r.status}: ${(await r.text()).slice(0, 150)}` };
}

async function validateStripe(secretKey?: string) {
  if (!secretKey) return { ok: false as const, error: "secret_key required" };
  const r = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  return r.ok
    ? { ok: true as const }
    : { ok: false as const, error: `${r.status}` };
}

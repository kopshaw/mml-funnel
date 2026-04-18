/**
 * Client domain management API.
 *
 * All endpoints require auth + admin role for the target client_id.
 *
 *   GET    /api/clients/domains?client_id=...       → current domain config
 *   PATCH  /api/clients/domains                      → update subdomain
 *   POST   /api/clients/domains                      → add custom domain
 *   POST   /api/clients/domains?action=verify        → verify custom domain DNS
 *   DELETE /api/clients/domains?client_id=...        → remove custom domain
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyCustomDomain,
  generateVerificationToken,
  EXPECTED_CNAME_TARGETS,
} from "@/lib/domain-verification";

async function requireAdminForClient(
  clientId: string
): Promise<{ user_id: string } | { error: string; status: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401 };

  // Admins have universal access; client_users with role=admin can manage their own
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
// GET — current domain config
// ---------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  const auth = await requireAdminForClient(clientId);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select(
      "id, name, slug, subdomain, custom_domain, custom_domain_status, custom_domain_verified_at, custom_domain_error, custom_domain_verification_token"
    )
    .eq("id", clientId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({
    client: data,
    expected_cname_targets: EXPECTED_CNAME_TARGETS,
    verification_txt_host: data.custom_domain
      ? `_sophia-verify.${data.custom_domain}`
      : null,
  });
}

// ---------------------------------------------------------------------
// PATCH — update subdomain
// ---------------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { client_id, subdomain } = body as { client_id?: string; subdomain?: string };

  if (!client_id || typeof subdomain !== "string") {
    return NextResponse.json({ error: "client_id and subdomain required" }, { status: 400 });
  }

  const auth = await requireAdminForClient(client_id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sub = subdomain.toLowerCase().trim();

  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(sub)) {
    return NextResponse.json(
      { error: "Subdomain must be 3-64 chars, lowercase letters/digits/hyphens, no leading/trailing hyphen" },
      { status: 400 }
    );
  }

  const reserved = new Set([
    "www", "api", "admin", "app", "mail", "email", "blog", "docs", "help",
    "support", "status", "billing", "account", "login", "signup", "signin",
    "auth", "sophia", "dashboard",
  ]);
  if (reserved.has(sub)) {
    return NextResponse.json({ error: "That subdomain is reserved" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Grab prior for audit
  const { data: prior } = await admin
    .from("clients")
    .select("subdomain")
    .eq("id", client_id)
    .single();

  const { error } = await admin
    .from("clients")
    .update({ subdomain: sub })
    .eq("id", client_id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Subdomain already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("client_domain_events").insert({
    client_id,
    event_type: prior?.subdomain ? "subdomain_changed" : "subdomain_set",
    previous_value: prior?.subdomain ?? null,
    new_value: sub,
    actor_user_id: auth.user_id,
  });

  return NextResponse.json({
    ok: true,
    subdomain: sub,
    url: `https://${sub}.sophiafunnels.com`,
  });
}

// ---------------------------------------------------------------------
// POST — add custom domain OR verify
// ---------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "verify") {
    return verify(request);
  }

  const body = await request.json();
  const { client_id, custom_domain } = body as {
    client_id?: string;
    custom_domain?: string;
  };

  if (!client_id || !custom_domain) {
    return NextResponse.json({ error: "client_id and custom_domain required" }, { status: 400 });
  }

  const auth = await requireAdminForClient(client_id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const domain = custom_domain.toLowerCase().replace(/^https?:\/\//, "").split("/")[0].trim();

  // Basic validation — must look like a domain
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)) {
    return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
  }
  if (domain.endsWith(".sophiafunnels.com")) {
    return NextResponse.json(
      { error: "Use the subdomain field for sophiafunnels.com subdomains" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const verificationToken = generateVerificationToken();

  const { error } = await admin
    .from("clients")
    .update({
      custom_domain: domain,
      custom_domain_status: "pending",
      custom_domain_error: null,
      custom_domain_verification_token: verificationToken,
      custom_domain_verified_at: null,
    })
    .eq("id", client_id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That domain is already attached to another workspace" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("client_domain_events").insert({
    client_id,
    event_type: "custom_domain_added",
    new_value: domain,
    actor_user_id: auth.user_id,
  });

  return NextResponse.json({
    ok: true,
    custom_domain: domain,
    status: "pending",
    instructions: {
      cname_target: EXPECTED_CNAME_TARGETS[0],
      message: `Create a CNAME record on ${domain} pointing to ${EXPECTED_CNAME_TARGETS[0]}, then click Verify.`,
      txt_fallback: {
        host: `_sophia-verify.${domain}`,
        value: verificationToken,
      },
    },
  });
}

async function verify(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const clientId =
    (body as { client_id?: string }).client_id ??
    new URL(request.url).searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  const auth = await requireAdminForClient(clientId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("custom_domain, custom_domain_verification_token")
    .eq("id", clientId)
    .single();

  if (!client?.custom_domain) {
    return NextResponse.json({ error: "No custom domain configured" }, { status: 400 });
  }

  // Mark verifying for UI feedback
  await admin
    .from("clients")
    .update({ custom_domain_status: "verifying", custom_domain_error: null })
    .eq("id", clientId);

  const result = await verifyCustomDomain(
    client.custom_domain,
    client.custom_domain_verification_token as string | null
  );

  if (result.ok) {
    await admin
      .from("clients")
      .update({
        custom_domain_status: "verified",
        custom_domain_verified_at: new Date().toISOString(),
        custom_domain_error: null,
      })
      .eq("id", clientId);

    await admin.from("client_domain_events").insert({
      client_id: clientId,
      event_type: "custom_domain_verified",
      new_value: client.custom_domain,
      actor_user_id: auth.user_id,
      metadata: { cname_target: result.cname_target },
    });

    return NextResponse.json({
      ok: true,
      status: "verified",
      cname_target: result.cname_target,
      url: `https://${client.custom_domain}`,
    });
  }

  await admin
    .from("clients")
    .update({
      custom_domain_status: "failed",
      custom_domain_error: result.details ?? result.reason,
    })
    .eq("id", clientId);

  await admin.from("client_domain_events").insert({
    client_id: clientId,
    event_type: "custom_domain_verification_failed",
    new_value: client.custom_domain,
    actor_user_id: auth.user_id,
    metadata: { reason: result.reason, details: result.details },
  });

  return NextResponse.json(
    {
      ok: false,
      status: "failed",
      reason: result.reason,
      details: result.details,
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------
// DELETE — remove custom domain
// ---------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  const auth = await requireAdminForClient(clientId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data: prior } = await admin
    .from("clients")
    .select("custom_domain")
    .eq("id", clientId)
    .single();

  await admin
    .from("clients")
    .update({
      custom_domain: null,
      custom_domain_status: "revoked",
      custom_domain_verified_at: null,
      custom_domain_error: null,
      custom_domain_verification_token: null,
    })
    .eq("id", clientId);

  if (prior?.custom_domain) {
    await admin.from("client_domain_events").insert({
      client_id: clientId,
      event_type: "custom_domain_removed",
      previous_value: prior.custom_domain,
      actor_user_id: auth.user_id,
    });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Host → Workspace resolver.
 *
 * Every landing-page request carries a Host header that tells us which
 * workspace the visitor is trying to reach:
 *
 *   sophiafunnels.com              → main marketing site (no workspace)
 *   www.sophiafunnels.com          → main marketing site
 *   {sub}.sophiafunnels.com        → client with subdomain = {sub}
 *   {custom-domain}                → client with verified custom_domain
 *
 * Used by the landing page route to scope funnel lookups to the right
 * workspace. Also used by the dashboard to display the current workspace.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface ResolvedWorkspace {
  client_id: string;
  name: string;
  slug: string;
  tier: string;
  subdomain: string | null;
  custom_domain: string | null;
  match_type: "subdomain" | "custom_domain" | "main_site";
}

const MAIN_SITE_HOSTS = new Set([
  "sophiafunnels.com",
  "www.sophiafunnels.com",
  "selfhealingfunnel.metricmentorlabs.com",
  "localhost",
  "127.0.0.1",
]);

const ROOT_DOMAIN = "sophiafunnels.com";

/**
 * Normalize a Host header value — strip port, lowercase.
 */
export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  return host.split(":")[0].toLowerCase().trim();
}

/**
 * Given a Host header, resolve to the workspace.
 *
 * Returns null if this is the main marketing site.
 */
export async function resolveWorkspaceFromHost(
  rawHost: string | null | undefined
): Promise<ResolvedWorkspace | null> {
  const host = normalizeHost(rawHost);
  if (!host) return null;

  // Main site / local dev — no workspace scoping, backward compatible
  if (MAIN_SITE_HOSTS.has(host)) return null;

  // Subdomain of sophiafunnels.com
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = host.slice(0, -1 * (ROOT_DOMAIN.length + 1));
    // Reject nested subdomains (e.g. "foo.bar.sophiafunnels.com")
    if (sub.includes(".")) return null;

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("clients")
      .select("id, name, slug, tier, subdomain, custom_domain, status")
      .eq("subdomain", sub)
      .eq("status", "active")
      .maybeSingle();

    if (!data) return null;
    return {
      client_id: data.id as string,
      name: data.name as string,
      slug: data.slug as string,
      tier: data.tier as string,
      subdomain: data.subdomain as string,
      custom_domain: data.custom_domain as string | null,
      match_type: "subdomain",
    };
  }

  // Custom domain (must be verified)
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, slug, tier, subdomain, custom_domain, status, custom_domain_status")
    .eq("custom_domain", host)
    .eq("custom_domain_status", "verified")
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;
  return {
    client_id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    tier: data.tier as string,
    subdomain: data.subdomain as string | null,
    custom_domain: data.custom_domain as string,
    match_type: "custom_domain",
  };
}

/**
 * Build the canonical URL for a given client + optional path.
 * Prefers verified custom domain, falls back to subdomain, falls back to main site.
 */
export function canonicalUrlFor(
  client: Pick<ResolvedWorkspace, "subdomain" | "custom_domain"> & {
    custom_domain_status?: string;
  },
  path: string = "/"
): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (client.custom_domain && client.custom_domain_status === "verified") {
    return `https://${client.custom_domain}${cleanPath}`;
  }
  if (client.subdomain) {
    return `https://${client.subdomain}.${ROOT_DOMAIN}${cleanPath}`;
  }
  return `https://${ROOT_DOMAIN}${cleanPath}`;
}

export { ROOT_DOMAIN };

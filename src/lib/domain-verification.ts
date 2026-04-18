/**
 * DNS verification for custom domains.
 *
 * When a customer adds their own domain (e.g. `funnels.acme.com`), they
 * need to point it at our edge via a CNAME. This module checks that
 * configuration so we can mark the domain verified.
 *
 * Uses Cloudflare's DNS-over-HTTPS API — no DNS library needed.
 */

export type VerificationResult =
  | { ok: true; cname_target: string }
  | { ok: false; reason: string; details?: string };

const EXPECTED_CNAME_TARGETS = [
  "sophiafunnels.com",
  "selfhealingfunnel.metricmentorlabs.com",
];

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
  Authority?: DohAnswer[];
}

async function resolveCNAME(domain: string): Promise<string | null> {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`;
    const res = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as DohResponse;
    if (data.Status !== 0 || !data.Answer) return null;
    const cname = data.Answer.find((a) => a.type === 5); // CNAME
    if (!cname) return null;
    // data may end with a dot — normalize
    return cname.data.replace(/\.$/, "").toLowerCase();
  } catch {
    return null;
  }
}

async function resolveTXT(domain: string): Promise<string[]> {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=TXT`;
    const res = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as DohResponse;
    if (data.Status !== 0 || !data.Answer) return [];
    return data.Answer
      .filter((a) => a.type === 16) // TXT
      .map((a) => a.data.replace(/^"|"$/g, ""));
  } catch {
    return [];
  }
}

export async function verifyCustomDomain(
  domain: string,
  expectedVerificationToken?: string | null
): Promise<VerificationResult> {
  const clean = domain.toLowerCase().replace(/^https?:\/\//, "").split("/")[0].trim();

  if (!clean.includes(".") || clean.length < 4) {
    return { ok: false, reason: "Domain is invalid" };
  }

  // Check the CNAME at the domain (or at the apex — some folks use ALIAS/flattened)
  const cname = await resolveCNAME(clean);

  if (cname && EXPECTED_CNAME_TARGETS.includes(cname)) {
    return { ok: true, cname_target: cname };
  }

  // Fallback: check for verification TXT record (some registrars don't
  // support CNAME at apex; users may use _sophia-verify.example.com TXT)
  if (expectedVerificationToken) {
    const txtHost = `_sophia-verify.${clean}`;
    const txts = await resolveTXT(txtHost);
    if (txts.includes(expectedVerificationToken)) {
      return { ok: true, cname_target: "verified_via_txt" };
    }
  }

  return {
    ok: false,
    reason: "CNAME record not found or pointing to wrong target",
    details: cname
      ? `Current CNAME: ${cname}. Expected one of: ${EXPECTED_CNAME_TARGETS.join(", ")}`
      : `No CNAME found. Create a CNAME record on ${clean} pointing to sophiafunnels.com`,
  };
}

export function generateVerificationToken(): string {
  // 32 hex chars, non-crypto — it's an anti-squatting check, not auth
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export { EXPECTED_CNAME_TARGETS };

import { createHmac, timingSafeEqual } from "crypto";

const TOLERANCE_SECONDS = 5 * 60;

export function verifySvixSignature({
  id,
  timestamp,
  signatureHeader,
  body,
  secret,
}: {
  id: string;
  timestamp: string;
  signatureHeader: string;
  body: string;
  secret: string;
}): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) return false;

  const secretRaw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = Buffer.from(secretRaw, "base64");

  const signed = `${id}.${timestamp}.${body}`;
  const expected = createHmac("sha256", key).update(signed).digest();

  const provided = signatureHeader.split(" ").map((s) => s.trim()).filter(Boolean);
  for (const sig of provided) {
    const [version, value] = sig.split(",");
    if (version !== "v1" || !value) continue;
    let got: Buffer;
    try {
      got = Buffer.from(value, "base64");
    } catch {
      continue;
    }
    if (got.length === expected.length && timingSafeEqual(got, expected)) {
      return true;
    }
  }
  return false;
}

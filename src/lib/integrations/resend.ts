import { Resend } from "resend";
import type { ReactElement } from "react";
import { getCredentials } from "@/lib/integrations/credentials";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailOptions {
  /** Reply-to address (defaults to from address) */
  replyTo?: string;
  /** BCC recipients */
  bcc?: string | string[];
  /** CC recipients */
  cc?: string | string[];
  /** Custom headers */
  headers?: Record<string, string>;
  /** Tags for analytics segmentation */
  tags?: { name: string; value: string }[];
  /** Schedule send — ISO-8601 datetime string */
  scheduledAt?: string;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  react: ReactElement;
  options?: EmailOptions;
}

export interface EmailResult {
  id: string;
}

export interface BulkEmailResult {
  data: EmailResult[];
  errors: Array<{ index: number; message: string }>;
}

// ---------------------------------------------------------------------------
// Per-tenant client resolution
//
// Every sender call now takes an optional clientId. If set we load that
// tenant's Resend key + sender domain; otherwise fall back to MML's env.
// ---------------------------------------------------------------------------

interface ResendContext {
  client: Resend;
  from: string;
}

async function getResendContext(clientId: string | null | undefined): Promise<ResendContext> {
  const creds = await getCredentials(clientId ?? null, "resend");
  if (!creds) {
    throw new Error(
      "Resend is not configured. Set RESEND_API_KEY (env) or connect Resend via Settings → Integrations."
    );
  }
  const apiKey = creds.credentials.api_key;
  if (!apiKey) throw new Error("Resend credentials missing api_key");

  return {
    client: new Resend(apiKey),
    from:
      creds.credentials.from_address ||
      (creds.metadata as { from_address?: string }).from_address ||
      "MML Funnel <onboarding@resend.dev>",
  };
}

// ---------------------------------------------------------------------------
// Single email
// ---------------------------------------------------------------------------

export async function sendEmail(
  to: string | string[],
  subject: string,
  react: ReactElement,
  options: EmailOptions & { clientId?: string | null } = {}
): Promise<EmailResult> {
  const { client: resend, from } = await getResendContext(options.clientId);

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    react,
    replyTo: options.replyTo,
    bcc: options.bcc,
    cc: options.cc,
    headers: options.headers,
    tags: options.tags,
    scheduledAt: options.scheduledAt,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  return { id: data!.id };
}

// ---------------------------------------------------------------------------
// Plain text email (for AI agent replies, etc.)
// ---------------------------------------------------------------------------

export async function sendTextEmail(
  to: string,
  subject: string,
  text: string,
  options: EmailOptions & { clientId?: string | null } = {}
): Promise<EmailResult> {
  const { client: resend, from } = await getResendContext(options.clientId);

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    text,
    replyTo: options.replyTo,
    headers: options.headers,
    tags: options.tags,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  return { id: data!.id };
}

// ---------------------------------------------------------------------------
// Bulk send (up to 100 per batch via Resend)
// ---------------------------------------------------------------------------

export async function sendBulk(
  emails: EmailPayload[],
  options: { clientId?: string | null } = {}
): Promise<BulkEmailResult> {
  const { client: resend, from } = await getResendContext(options.clientId);

  const results: EmailResult[] = [];
  const errors: Array<{ index: number; message: string }> = [];

  // Resend batch endpoint accepts up to 100 emails at a time
  const BATCH_SIZE = 100;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    const payload = batch.map((email) => ({
      from,
      to: Array.isArray(email.to) ? email.to : [email.to],
      subject: email.subject,
      react: email.react,
      replyTo: email.options?.replyTo,
      bcc: email.options?.bcc,
      cc: email.options?.cc,
      headers: email.options?.headers,
      tags: email.options?.tags,
    }));

    const { data, error } = await resend.batch.send(payload);

    if (error) {
      // Record error against every email in this batch
      batch.forEach((_, batchIdx) => {
        errors.push({ index: i + batchIdx, message: error.message });
      });
    } else if (data) {
      data.data.forEach((item) => results.push({ id: item.id }));
    }
  }

  return { data: results, errors };
}

import { Resend } from "resend";
import type { ReactElement } from "react";

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
// Client singleton
// ---------------------------------------------------------------------------

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? "MML Funnel <noreply@metricmentorlabs.com>";

let _resend: Resend | null = null;

function getClient(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

// ---------------------------------------------------------------------------
// Single email
// ---------------------------------------------------------------------------

export async function sendEmail(
  to: string | string[],
  subject: string,
  react: ReactElement,
  options: EmailOptions = {}
): Promise<EmailResult> {
  const resend = getClient();

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
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
  options: EmailOptions = {}
): Promise<EmailResult> {
  const resend = getClient();

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
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
  emails: EmailPayload[]
): Promise<BulkEmailResult> {
  const resend = getClient();

  const results: EmailResult[] = [];
  const errors: Array<{ index: number; message: string }> = [];

  // Resend batch endpoint accepts up to 100 emails at a time
  const BATCH_SIZE = 100;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    const payload = batch.map((email) => ({
      from: FROM_ADDRESS,
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

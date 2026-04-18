import twilio from "twilio";
import crypto from "crypto";
import { getCredentials } from "@/lib/integrations/credentials";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SMSResult {
  sid: string;
  status: string;
  to: string;
}

// ---------------------------------------------------------------------------
// Per-tenant Twilio context
// ---------------------------------------------------------------------------

interface TwilioContext {
  client: twilio.Twilio;
  from: string;
  authToken: string;
}

async function getTwilioContext(clientId: string | null | undefined): Promise<TwilioContext> {
  const creds = await getCredentials(clientId ?? null, "twilio");
  if (!creds) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER (env) or connect Twilio via Settings → Integrations."
    );
  }
  const { account_sid, auth_token, phone_number } = creds.credentials;
  if (!account_sid || !auth_token) {
    throw new Error("Twilio credentials missing account_sid or auth_token");
  }
  if (!phone_number) {
    throw new Error("Twilio phone_number not configured");
  }
  return {
    client: twilio(account_sid, auth_token),
    from: phone_number,
    authToken: auth_token,
  };
}

// ---------------------------------------------------------------------------
// Send SMS
// ---------------------------------------------------------------------------

export async function sendSMS(
  to: string,
  body: string,
  options: { clientId?: string | null } = {}
): Promise<SMSResult> {
  const { client, from } = await getTwilioContext(options.clientId);

  const message = await client.messages.create({
    to,
    from,
    body,
  });

  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
  };
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/**
 * Verify that an incoming request is genuinely from Twilio.
 * Takes clientId so we can verify against the tenant's auth_token.
 */
export async function verifyWebhookSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  options: { clientId?: string | null } = {}
): Promise<boolean> {
  const { authToken } = await getTwilioContext(options.clientId);

  const sortedKeys = Object.keys(params).sort();
  const dataString = url + sortedKeys.map((key) => key + params[key]).join("");

  const computed = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(dataString, "utf-8"))
    .digest("base64");

  return computed === signature;
}

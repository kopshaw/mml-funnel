import twilio from "twilio";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SMSResult {
  sid: string;
  status: string;
  to: string;
}

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!_client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error(
        "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required"
      );
    }

    _client = twilio(accountSid, authToken);
  }
  return _client;
}

function getFromNumber(): string {
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!phoneNumber) {
    throw new Error("TWILIO_PHONE_NUMBER environment variable is not set");
  }
  return phoneNumber;
}

// ---------------------------------------------------------------------------
// Send SMS
// ---------------------------------------------------------------------------

export async function sendSMS(to: string, body: string): Promise<SMSResult> {
  const client = getClient();

  const message = await client.messages.create({
    to,
    from: getFromNumber(),
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
 *
 * @param url    The full URL of your webhook endpoint (including https://)
 * @param params The parsed request body (key-value pairs)
 * @param signature The value of the `X-Twilio-Signature` header
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    throw new Error(
      "TWILIO_AUTH_TOKEN environment variable is required for signature verification"
    );
  }

  // Build the data string: URL + sorted params concatenated as key=value
  const sortedKeys = Object.keys(params).sort();
  const dataString =
    url + sortedKeys.map((key) => key + params[key]).join("");

  const computed = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(dataString, "utf-8"))
    .digest("base64");

  return computed === signature;
}

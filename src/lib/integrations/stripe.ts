import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckoutSessionParams {
  /** Price ID from Stripe dashboard */
  priceId: string;
  /** Customer email for pre-filling checkout */
  customerEmail?: string;
  /** URL to redirect after successful payment */
  successUrl: string;
  /** URL to redirect if customer cancels */
  cancelUrl: string;
  /** Metadata to attach to the session (e.g., leadId, funnelStep) */
  metadata?: Record<string, string>;
  /** Allow promotion codes */
  allowPromotionCodes?: boolean;
  /** Existing Stripe customer ID (if known) */
  customerId?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _stripe: Stripe | null = null;

function getClient(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

// ---------------------------------------------------------------------------
// Create checkout session (low-ticket purchases)
// ---------------------------------------------------------------------------

export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const stripe = getClient();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
    allow_promotion_codes: params.allowPromotionCodes ?? false,
  };

  if (params.customerId) {
    sessionParams.customer = params.customerId;
  } else if (params.customerEmail) {
    sessionParams.customer_email = params.customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error("Stripe checkout session created without a URL");
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/**
 * Verify and parse a Stripe webhook event.
 *
 * @param body      Raw request body as a string or Buffer
 * @param signature Value of the `stripe-signature` header
 * @returns         The verified Stripe event object
 */
export function verifyWebhookSignature(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getClient();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

// ---------------------------------------------------------------------------
// Re-export Stripe types that consumers may need
// ---------------------------------------------------------------------------

export type { Stripe };

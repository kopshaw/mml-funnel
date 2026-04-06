import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

/**
 * Handle Stripe payment events for revenue tracking and attribution.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(supabase, session);
      break;
    }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(supabase, paymentIntent);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const email = session.customer_email || session.customer_details?.email;
  const amountCents = session.amount_total || 0;

  if (!email) return;

  // Find contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, funnel_id")
    .eq("email", email)
    .single();

  if (!contact) return;

  // Log as closed_won
  await supabase
    .from("contacts")
    .update({ qualification_status: "closed_won" })
    .eq("id", contact.id);

  await supabase.from("pipeline_events").insert({
    contact_id: contact.id,
    funnel_id: contact.funnel_id,
    event_type: "closed_won",
    event_data: {
      amount_cents: amountCents,
      stripe_session_id: session.id,
      payment_status: session.payment_status,
    },
  });
}

async function handlePaymentSuccess(
  supabase: ReturnType<typeof createAdminClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const email = paymentIntent.receipt_email;
  if (!email) return;

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, funnel_id")
    .eq("email", email)
    .single();

  if (!contact) return;

  await supabase.from("pipeline_events").insert({
    contact_id: contact.id,
    funnel_id: contact.funnel_id,
    event_type: "closed_won",
    event_data: {
      amount_cents: paymentIntent.amount,
      stripe_payment_intent_id: paymentIntent.id,
    },
  });
}

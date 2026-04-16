"use client";

import { useState } from "react";

/**
 * Client-side lead capture form. Used by both long-form (server component)
 * and short-form (client component) layouts.
 */
export function ClientLeadForm({
  funnel,
  variantId,
  utmParams,
  ctaText,
  formTitle,
  variant = "card",
}: {
  funnel: {
    id: string;
    name: string;
    description: string | null;
    offer_type: string;
    offer_price_cents: number;
  };
  variantId?: string;
  utmParams: Record<string, string | undefined>;
  ctaText: string;
  formTitle?: string;
  variant?: "card" | "inline";
}) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      funnelId: funnel.id,
      variantId,
      ...utmParams,
    };

    try {
      const res = await fetch("/api/ai/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "new_lead", ...data }),
      });
      if (res.ok) setSubmitted(true);
    } catch (err) {
      console.error("Form submission error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-8 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h3 className="text-xl font-bold text-white mb-2">You&apos;re in!</h3>
        <p className="text-emerald-200">
          Check your email and phone — we&apos;ll be in touch shortly with next steps.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        variant === "card"
          ? "bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl"
          : "rounded-xl bg-slate-900/50 border border-slate-800 p-6"
      }
    >
      {formTitle && (
        <h3 className="text-2xl font-bold mb-6 text-center text-white">{formTitle}</h3>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            name="firstName"
            type="text"
            placeholder="First name"
            required
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="lastName"
            type="text"
            placeholder="Last name"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <input
          name="email"
          type="email"
          placeholder="Email address"
          required
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          name="phone"
          type="tel"
          placeholder="Phone number"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
        >
          {submitting ? "Submitting..." : ctaText}
        </button>
      </form>
      {funnel.offer_price_cents > 0 && (
        <p className="text-sm text-slate-400 text-center mt-4">
          Starting at ${(funnel.offer_price_cents / 100).toLocaleString()}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

interface Props {
  funnel: {
    id: string;
    name: string;
    description: string | null;
    offer_type: string;
    offer_price_cents: number;
  };
  content: Record<string, string> | null;
  variantId?: string;
  utmParams: Record<string, string | undefined>;
}

export function LandingPageContent({ funnel, content, variantId, utmParams }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const headline = content?.headline || funnel.name;
  const subheadline = content?.subheadline || funnel.description || "";
  const ctaText = content?.cta_text || "Get Started";
  const bodyText = content?.body || "";

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

      if (res.ok) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error("Form submission error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-6">&#10003;</div>
          <h1 className="text-3xl font-bold mb-4">You&apos;re In!</h1>
          <p className="text-slate-300">
            We&apos;ll be in touch shortly. Check your email and phone for next steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          {headline}
        </h1>
        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          {subheadline}
        </p>
      </section>

      {/* Body Content */}
      {bodyText && (
        <section className="max-w-3xl mx-auto px-6 pb-12">
          <div
            className="text-lg text-slate-300 leading-relaxed prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: bodyText }}
          />
        </section>
      )}

      {/* Lead Capture Form */}
      <section className="max-w-md mx-auto px-6 pb-20">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {content?.form_title || "Start Here"}
          </h2>
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
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : ctaText}
            </button>
          </form>
          {funnel.offer_price_cents > 0 && (
            <p className="text-sm text-slate-400 text-center mt-4">
              Starting at ${(funnel.offer_price_cents / 100).toFixed(0)}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

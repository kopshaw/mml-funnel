"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types matching the new copywriter-agent output
// ---------------------------------------------------------------------------

interface RenderedSection {
  id: string;
  type: string;
  title?: string;
  body_html: string;
  body_text?: string;
  cta?: { text: string; type: "primary" | "secondary" };
  word_count?: number;
}

interface LongFormPage {
  meta_title?: string;
  meta_description?: string;
  hero: {
    headline: string;
    subheadline: string;
    cta_text: string;
    social_proof_callout?: string;
  };
  sections: RenderedSection[];
  total_word_count?: number;
}

interface ShortFormPage {
  meta_title?: string;
  meta_description?: string;
  hero: {
    headline: string;
    subheadline: string;
    cta_text: string;
  };
  outcome_bullets: { icon_hint: string; text: string }[];
  social_proof: { quote: string; attribution: string };
  closing_cta: { text: string; reassurance: string };
}

interface VariantContent {
  variant?: "long" | "short";
  page?: LongFormPage | ShortFormPage;
}

// Legacy flat shape from older funnels
interface LegacyContent {
  headline?: string;
  subheadline?: string;
  body?: string;
  body_html?: string;
  cta_text?: string;
  form_title?: string;
  social_proof_text?: string;
}

interface Props {
  funnel: {
    id: string;
    name: string;
    description: string | null;
    offer_type: string;
    offer_price_cents: number;
  };
  content: VariantContent | LegacyContent | Record<string, string> | null;
  variantLabel?: string;
  variantId?: string;
  utmParams: Record<string, string | undefined>;
}

// ---------------------------------------------------------------------------
// Lead-capture form (shared by both layouts)
// ---------------------------------------------------------------------------

function LeadForm({
  funnel,
  variantId,
  utmParams,
  ctaText,
  formTitle,
  variant = "card",
}: {
  funnel: Props["funnel"];
  variantId?: string;
  utmParams: Props["utmParams"];
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
          ? "bg-slate-900 border border-slate-800 rounded-2xl p-8"
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
  );
}

// ---------------------------------------------------------------------------
// Long-form rendering
// ---------------------------------------------------------------------------

function LongFormLayout({
  page,
  funnel,
  variantId,
  utmParams,
  variantLabel,
}: {
  page: LongFormPage;
  funnel: Props["funnel"];
  variantId?: string;
  utmParams: Props["utmParams"];
  variantLabel?: string;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
          {page.hero.social_proof_callout && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-300 mb-6">
              {page.hero.social_proof_callout}
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {page.hero.headline}
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            {page.hero.subheadline}
          </p>
          <a
            href="#cta"
            className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl transition-colors"
          >
            {page.hero.cta_text}
          </a>
        </div>
      </section>

      {/* SECTIONS */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-16">
        {page.sections.map((section, idx) => (
          <section
            key={section.id ?? idx}
            data-section-type={section.type}
            data-section-id={section.id}
            className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white prose-li:text-slate-300 prose-blockquote:text-slate-200 prose-blockquote:border-l-blue-500 prose-table:text-slate-300 prose-th:text-white prose-th:border-slate-700 prose-td:border-slate-800 prose-a:text-blue-400 hover:prose-a:text-blue-300"
            dangerouslySetInnerHTML={{ __html: section.body_html }}
          />
        ))}
      </div>

      {/* FINAL CTA */}
      <section id="cta" className="max-w-2xl mx-auto px-6 py-20">
        <LeadForm
          funnel={funnel}
          variantId={variantId}
          utmParams={utmParams}
          ctaText={page.hero.cta_text}
          formTitle="Get Started"
        />
      </section>

      {/* Footer / variant tag (only in dev) */}
      {variantLabel && process.env.NODE_ENV !== "production" && (
        <div className="text-center text-xs text-slate-600 pb-6">
          Variant: {variantLabel}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Short-form rendering
// ---------------------------------------------------------------------------

function ShortFormLayout({
  page,
  funnel,
  variantId,
  utmParams,
  variantLabel,
}: {
  page: ShortFormPage;
  funnel: Props["funnel"];
  variantId?: string;
  utmParams: Props["utmParams"];
  variantLabel?: string;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-16 grid lg:grid-cols-5 gap-12 items-start">
        {/* LEFT: hero + bullets + proof */}
        <div className="lg:col-span-3 space-y-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              {page.hero.headline}
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              {page.hero.subheadline}
            </p>
          </div>

          <ul className="space-y-3">
            {page.outcome_bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-3 text-lg text-slate-200">
                <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400" />
                <span>{bullet.text}</span>
              </li>
            ))}
          </ul>

          {page.social_proof?.quote && (
            <blockquote className="border-l-4 border-blue-500 bg-blue-500/5 p-6 rounded-r-lg">
              <p className="text-lg italic text-slate-200">
                &ldquo;{page.social_proof.quote}&rdquo;
              </p>
              <footer className="mt-3 text-sm text-slate-400">
                — {page.social_proof.attribution}
              </footer>
            </blockquote>
          )}
        </div>

        {/* RIGHT: lead form sticky */}
        <div className="lg:col-span-2 lg:sticky lg:top-8">
          <LeadForm
            funnel={funnel}
            variantId={variantId}
            utmParams={utmParams}
            ctaText={page.closing_cta?.text ?? page.hero.cta_text}
            formTitle="Get Started"
          />
          {page.closing_cta?.reassurance && (
            <p className="text-center text-sm text-slate-500 mt-3">
              {page.closing_cta.reassurance}
            </p>
          )}
        </div>
      </div>

      {variantLabel && process.env.NODE_ENV !== "production" && (
        <div className="text-center text-xs text-slate-600 pb-6">
          Variant: {variantLabel}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legacy fallback (older funnels with flat content)
// ---------------------------------------------------------------------------

function LegacyLayout({
  funnel,
  content,
  variantId,
  utmParams,
}: {
  funnel: Props["funnel"];
  content: LegacyContent | Record<string, string>;
  variantId?: string;
  utmParams: Props["utmParams"];
}) {
  const c = content as LegacyContent;
  const headline = c.headline || funnel.name;
  const subheadline = c.subheadline || funnel.description || "";
  const ctaText = c.cta_text || "Get Started";
  const bodyHtml = c.body_html || c.body || "";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">{headline}</h1>
        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">{subheadline}</p>
      </section>
      {bodyHtml && (
        <section className="max-w-3xl mx-auto px-6 pb-12">
          <div
            className="prose prose-invert prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </section>
      )}
      <section className="max-w-md mx-auto px-6 pb-20">
        <LeadForm
          funnel={funnel}
          variantId={variantId}
          utmParams={utmParams}
          ctaText={ctaText}
          formTitle={c.form_title || "Start Here"}
        />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-level: pick layout based on variant content shape
// ---------------------------------------------------------------------------

export function LandingPageContent({
  funnel,
  content,
  variantId,
  variantLabel,
  utmParams,
}: Props) {
  // New schema: { variant: "long"|"short", page: {...} }
  const variantContent = content as VariantContent | null;

  if (variantContent?.variant === "long" && variantContent.page) {
    return (
      <LongFormLayout
        page={variantContent.page as LongFormPage}
        funnel={funnel}
        variantId={variantId}
        utmParams={utmParams}
        variantLabel={variantLabel}
      />
    );
  }

  if (variantContent?.variant === "short" && variantContent.page) {
    return (
      <ShortFormLayout
        page={variantContent.page as ShortFormPage}
        funnel={funnel}
        variantId={variantId}
        utmParams={utmParams}
        variantLabel={variantLabel}
      />
    );
  }

  // Legacy / fallback
  return (
    <LegacyLayout
      funnel={funnel}
      content={(content ?? {}) as LegacyContent}
      variantId={variantId}
      utmParams={utmParams}
    />
  );
}

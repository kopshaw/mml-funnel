/**
 * Server component: renders the long-form landing page with enriched
 * sections, Unsplash photography, and rich visual components.
 *
 * This is rendered server-side so we can await image resolution and hit
 * the Unsplash API without leaking keys to the client.
 */

import { enrichSection } from "./section-enhancer";
import { RichSection } from "./rich-section";
import { StickyCTABar } from "./sticky-cta-bar";
import { ClientLeadForm } from "./client-lead-form";
import { resolveSectionImage, resolveHeroImage, type ResolvedImage } from "@/lib/ai/image-provider";

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

interface Funnel {
  id: string;
  name: string;
  description: string | null;
  offer_type: string;
  offer_price_cents: number;
}

export async function LongFormLayout({
  page,
  funnel,
  variantId,
  utmParams,
  variantLabel,
  brandName,
  targetAudience,
}: {
  page: LongFormPage;
  funnel: Funnel;
  variantId?: string;
  utmParams: Record<string, string | undefined>;
  variantLabel?: string;
  brandName?: string;
  targetAudience?: string;
}) {
  // Enrich each section and resolve its image in parallel
  const enrichedSections = page.sections.map((s, i) => enrichSection(s, i));

  // Resolve images (parallel) — offer_name as fallback query
  const heroImagePromise = resolveHeroImage(
    funnel.name,
    targetAudience ?? "professional business"
  );

  const sectionImagePromises = enrichedSections.map((section) =>
    resolveSectionImage(
      section.type,
      imageQueryFor(section.type, funnel.name, brandName),
      `${funnel.name} ${section.type.replace(/_/g, " ")}`
    )
  );

  const [heroImage, ...sectionImages] = await Promise.all([
    heroImagePromise,
    ...sectionImagePromises,
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HERO */}
      <HeroSection
        hero={page.hero}
        image={heroImage}
        funnel={funnel}
      />

      {/* TRUST ROW */}
      {page.hero.social_proof_callout && (
        <TrustRow text={page.hero.social_proof_callout} />
      )}

      {/* SECTIONS */}
      {enrichedSections.map((section, idx) => (
        <RichSection
          key={section.id ?? idx}
          section={section}
          image={sectionImages[idx]}
          ctaText={page.hero.cta_text}
          ctaHref="#cta"
        />
      ))}

      {/* FINAL CTA with form */}
      <section
        id="cta"
        className="relative py-20 md:py-28 border-t border-slate-800 bg-gradient-to-br from-blue-950/60 via-slate-900 to-slate-950"
      >
        <div className="max-w-xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {page.hero.cta_text}
            </h2>
            <p className="text-slate-300">
              Fill out the form and we&apos;ll be in touch within 24 hours.
            </p>
          </div>
          <ClientLeadForm
            funnel={funnel}
            variantId={variantId}
            utmParams={utmParams}
            ctaText={page.hero.cta_text}
            formTitle="Get Started"
          />
        </div>
      </section>

      {/* Sticky CTA bar */}
      <StickyCTABar
        headline={page.hero.headline}
        ctaText={page.hero.cta_text}
      />

      {/* Dev-only variant tag */}
      {variantLabel && process.env.NODE_ENV !== "production" && (
        <div className="text-center text-xs text-slate-600 py-4">
          Variant: {variantLabel}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero section with full-bleed image + overlay
// ---------------------------------------------------------------------------

function HeroSection({
  hero,
  image,
  funnel,
}: {
  hero: LongFormPage["hero"];
  image: ResolvedImage;
  funnel: Funnel;
}) {
  return (
    <section className="relative overflow-hidden">
      {/* Background image or gradient */}
      {image.provider === "unsplash" && image.url ? (
        <div className="absolute inset-0">
          <img
            src={image.url}
            alt={image.alt}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-900 to-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.15),transparent_70%)]" />
        </div>
      )}

      <div className="relative max-w-5xl mx-auto px-6 pt-24 md:pt-32 pb-20 md:pb-28 text-center">
        {hero.social_proof_callout && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-sm text-blue-300 mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            {hero.social_proof_callout}
          </div>
        )}

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
          {hero.headline}
        </h1>

        <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed font-light">
          {hero.subheadline}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href="#cta"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02]"
          >
            {hero.cta_text}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          {funnel.offer_price_cents > 0 && (
            <p className="text-sm text-slate-400">
              From ${(funnel.offer_price_cents / 100).toLocaleString()}
            </p>
          )}
        </div>

        {/* Attribution */}
        {image.provider === "unsplash" && image.attribution && (
          <a
            href={image.attribution.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-4 text-xs text-white/30 hover:text-white/60"
          >
            Photo: {image.attribution.name} / Unsplash
          </a>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Trust row
// ---------------------------------------------------------------------------

function TrustRow({ text }: { text: string }) {
  return (
    <section className="relative border-y border-slate-800 bg-slate-900/50 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-center gap-3">
        <div className="flex -space-x-2">
          {["A", "B", "C", "D", "E"].map((seed, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-slate-900 flex items-center justify-center text-xs font-bold"
            >
              {seed}
            </div>
          ))}
        </div>
        <p className="text-sm md:text-base text-slate-300 font-medium">{text}</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Image query picker per section type
// ---------------------------------------------------------------------------

function imageQueryFor(
  type: string,
  offerName: string,
  brandName?: string
): string {
  const base = brandName || offerName;
  const lookup: Record<string, string> = {
    hero: `${base} professional team`,
    problem_agitation: "stressed business owner office",
    failed_solutions: "frustrated laptop desk",
    origin_story: "team meeting whiteboard",
    solution_reveal: "professional team collaborating success",
    solution_introduction: "professional team collaborating success",
    how_it_works: "process workflow diagram",
    mechanism: "modern office dashboard",
    process_explanation: "project timeline steps",
    deliverables: "package professional delivery",
    offer_details: "professional handshake deal",
    feature_spotlight: "technology interface dashboard",
    feature_deep_dive: "laptop analytics data",
    who_its_for: "business professional thinking",
    social_proof: "happy clients testimonial success",
    founder_bio: "professional headshot confident",
    urgency: "clock deadline calendar",
    bonus: "gift wrapped surprise",
  };
  return lookup[type] ?? `${base} professional`;
}

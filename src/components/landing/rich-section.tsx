import type { EnrichedSection, Stat, Testimonial } from "./section-enhancer";
import { avatarFor, gradientFor, type ResolvedImage } from "@/lib/ai/image-provider";

// ---------------------------------------------------------------------------
// Stats strip — big numbers in a row
// ---------------------------------------------------------------------------

function StatsStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
      {stats.map((s, i) => (
        <div key={i} className="text-center">
          <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {s.value}
          </div>
          <div className="text-xs md:text-sm text-slate-400 mt-1 uppercase tracking-wider">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Testimonial cards — photo + quote + result
// ---------------------------------------------------------------------------

function TestimonialCards({ items }: { items: Testimonial[] }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 my-10">
      {items.map((t, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <img
              src={avatarFor(t.name)}
              alt={t.name}
              className="w-12 h-12 rounded-full bg-slate-700"
            />
            <div>
              <p className="text-sm font-semibold text-white">{t.name}</p>
              {t.result && (
                <p className="text-xs text-emerald-400 font-medium">{t.result}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed italic">
            &ldquo;{t.quote}&rdquo;
          </p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pull quote — large centered text
// ---------------------------------------------------------------------------

function PullQuote({ text }: { text: string }) {
  return (
    <div className="my-10 py-8 px-6 md:px-12 border-y-2 border-blue-500/30">
      <blockquote className="text-center text-2xl md:text-3xl font-bold text-white leading-tight">
        <span className="text-blue-400">&ldquo;</span>
        {text}
        <span className="text-blue-400">&rdquo;</span>
      </blockquote>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checkmark bullet list — styled
// ---------------------------------------------------------------------------

function CheckmarkList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-4 my-8">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <div className="shrink-0 mt-1 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span
            className="text-lg text-slate-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: item }}
          />
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Section hero image with overlay
// ---------------------------------------------------------------------------

function SectionHeroImage({
  image,
  icon,
  seed,
}: {
  image: ResolvedImage;
  icon: string;
  seed: string;
}) {
  if (image.provider === "unsplash" && image.url) {
    return (
      <div className="relative rounded-2xl overflow-hidden aspect-[21/9] mb-8 border border-slate-800">
        <img
          src={image.url}
          alt={image.alt}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute bottom-4 right-4 text-5xl">{icon}</div>
        {image.attribution && (
          <a
            href={image.attribution.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 left-4 text-xs text-white/50 hover:text-white/80"
          >
            Photo: {image.attribution.name} / Unsplash
          </a>
        )}
      </div>
    );
  }

  // Gradient fallback
  const grad = gradientFor(seed);
  return (
    <div
      className="relative rounded-2xl overflow-hidden aspect-[21/9] mb-8 flex items-center justify-center"
      style={{ background: grad }}
    >
      <span className="text-7xl md:text-8xl drop-shadow-lg">{icon}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main section component
// ---------------------------------------------------------------------------

export function RichSection({
  section,
  image,
  ctaText,
  ctaHref = "#cta",
}: {
  section: EnrichedSection;
  image: ResolvedImage;
  ctaText?: string;
  ctaHref?: string;
}) {
  const bgClass =
    section.suggested_background === "light"
      ? "bg-slate-900"
      : section.suggested_background === "gradient"
      ? "bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950"
      : "bg-slate-950";

  const showImage =
    !["faq", "pricing", "objection_handling", "call_to_action", "final_cta", "comparison_table"].includes(
      section.type
    );

  return (
    <section
      data-section-type={section.type}
      data-section-id={section.id}
      className={`relative ${bgClass} py-16 md:py-24 border-t border-slate-800/50`}
    >
      <div className="max-w-4xl mx-auto px-6">
        {/* Section label */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">{section.suggested_icon}</span>
          <span className="text-xs uppercase tracking-widest text-blue-400 font-semibold">
            {section.type.replace(/_/g, " ")}
          </span>
        </div>

        {/* Section image */}
        {showImage && (
          <SectionHeroImage
            image={image}
            icon={section.suggested_icon}
            seed={section.id}
          />
        )}

        {/* H2 */}
        {section.h2 && (
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {section.h2}
          </h2>
        )}

        {/* Lead paragraph */}
        {section.lead_paragraph && (
          <div
            className="text-xl md:text-2xl text-slate-300 leading-relaxed mb-8 font-light"
            dangerouslySetInnerHTML={{ __html: section.lead_paragraph }}
          />
        )}

        {/* Stats strip if this section had extractable numbers */}
        {section.stats && section.stats.length >= 2 && <StatsStrip stats={section.stats} />}

        {/* Bullets */}
        {section.bullets && <CheckmarkList items={section.bullets} />}

        {/* Testimonials */}
        {section.testimonials && section.testimonials.length > 0 && (
          <TestimonialCards items={section.testimonials} />
        )}

        {/* Remaining body */}
        {section.body_html && (
          <div
            className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white prose-li:text-slate-300 prose-blockquote:text-slate-200 prose-blockquote:border-l-blue-500 prose-table:text-slate-300 prose-th:text-white prose-th:border-slate-700 prose-td:border-slate-800 prose-a:text-blue-400 hover:prose-a:text-blue-300"
            dangerouslySetInnerHTML={{ __html: section.body_html }}
          />
        )}

        {/* Pull quote */}
        {section.pull_quote && <PullQuote text={section.pull_quote} />}

        {/* Mid-page CTA every few sections */}
        {ctaText && (section.type === "solution_reveal" || section.type === "social_proof" || section.type === "guarantee") && (
          <div className="mt-10 text-center">
            <a
              href={ctaHref}
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-blue-600/20"
            >
              {ctaText}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

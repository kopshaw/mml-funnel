/**
 * Server-side content enricher for landing page sections.
 *
 * The copywriter outputs body_html. For visual polish, we parse that HTML
 * and extract structured pieces that the renderer can display with proper
 * React components (stat strips, callouts, testimonial cards, etc.) instead
 * of a flat prose block.
 *
 * Kept intentionally simple — regex-based extraction, no DOM library.
 */

export interface EnrichedSection {
  type: string;
  id: string;
  title?: string;
  // Pulled pieces
  h2: string | null;
  lead_paragraph: string | null; // The first <p> after the H2
  body_html: string;             // The rest of the section (post-lead)
  bullets: string[] | null;       // First <ul> as an array
  stats: Stat[] | null;            // Big-number callouts extracted
  testimonials: Testimonial[] | null;
  pull_quote: string | null;
  // Display hints
  suggested_icon: string;
  suggested_background: "light" | "dark" | "gradient" | "photo";
  should_invert: boolean; // alternating row layout
}

export interface Stat {
  value: string;
  label: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  result?: string;
}

// ---------------------------------------------------------------------------
// Regex extractors
// ---------------------------------------------------------------------------

function firstMatch(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function allMatches(html: string, re: RegExp): string[] {
  const out: string[] = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1].trim());
  return out;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Extract H2 and lead paragraph, return the remainder
// ---------------------------------------------------------------------------

function extractHeroSlice(html: string): {
  h2: string | null;
  lead: string | null;
  rest: string;
} {
  const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const h2 = h2Match ? stripTags(h2Match[1]) : null;

  let rest = html;
  if (h2Match) {
    rest = html.slice(h2Match.index! + h2Match[0].length);
  }

  const leadMatch = rest.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  let lead: string | null = null;
  if (leadMatch) {
    lead = leadMatch[1]; // keep inline tags for emphasis
    rest = rest.slice(0, leadMatch.index) + rest.slice(leadMatch.index! + leadMatch[0].length);
  }

  return { h2, lead, rest: rest.trim() };
}

// ---------------------------------------------------------------------------
// Extract bullets (first top-level UL)
// ---------------------------------------------------------------------------

function extractBullets(html: string): { bullets: string[] | null; rest: string } {
  const ulMatch = html.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (!ulMatch) return { bullets: null, rest: html };

  const items = allMatches(ulMatch[1], /<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (items.length < 2) return { bullets: null, rest: html };

  const bullets = items.map((i) => stripTags(i));
  const rest =
    html.slice(0, ulMatch.index) +
    html.slice(ulMatch.index! + ulMatch[0].length);

  return { bullets, rest: rest.trim() };
}

// ---------------------------------------------------------------------------
// Extract stats — look for patterns like "$50K MRR" or "200+ agency owners"
// inside bold/em tags or standalone paragraphs
// ---------------------------------------------------------------------------

function extractStats(html: string, sectionType: string): Stat[] | null {
  // Only try this on social_proof / outcomes / hero-style sections
  if (!["social_proof", "hero", "deliverables", "offer_details"].includes(sectionType)) {
    return null;
  }

  const text = stripTags(html);
  const candidates: Stat[] = [];

  // Patterns: "$50K", "200+", "10x", "3x ROI"
  const patterns = [
    /\$(\d+(?:\.\d+)?[KMB]?)[\s+]?(MRR|ARR|revenue|per month|\/mo|monthly)/gi,
    /(\d+\+?)\s+(agency owners|clients|businesses|customers|companies|users)/gi,
    /(\d+x)\s+(ROI|growth|faster|return)/gi,
    /(\d+)\s+(hours?\/week|weeks|days)\s+(back|saved)?/gi,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null && candidates.length < 4) {
      candidates.push({
        value: m[1].startsWith("$") ? m[1] : `$${m[1]}`.replace("$$", "$").replace(/^\$(\d+x)$/, "$1"),
        label: m[2],
      });
    }
  }

  return candidates.length >= 2 ? candidates.slice(0, 4) : null;
}

// ---------------------------------------------------------------------------
// Extract testimonials from <blockquote> tags
// ---------------------------------------------------------------------------

function extractTestimonials(html: string): Testimonial[] | null {
  const blockquotes = allMatches(html, /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi);
  if (blockquotes.length === 0) return null;

  return blockquotes
    .map((bq) => {
      const cleaned = stripTags(bq);
      // Try to split "quote" — author or quote - author
      const parts = cleaned.split(/\s+[—–-]\s+/);
      if (parts.length >= 2) {
        const quote = parts[0].replace(/^["'""]+|["'""]+$/g, "");
        const namePart = parts.slice(1).join(" — ");
        const resultMatch = namePart.match(/\((.+?)\)/);
        const name = namePart.replace(/\s*\(.+?\)\s*/, "").trim();
        return {
          quote,
          name,
          result: resultMatch ? resultMatch[1] : undefined,
        };
      }
      return { quote: cleaned, name: "Client" };
    })
    .filter((t) => t.quote.length > 20);
}

// ---------------------------------------------------------------------------
// Pull quote — find a short, punchy sentence with emphasis for callout
// ---------------------------------------------------------------------------

function extractPullQuote(html: string): string | null {
  // Look for <strong>...</strong> wrapped in a <p> — copywriters often
  // emphasize the key line.
  const strongInP = html.match(/<p[^>]*>\s*<strong>([\s\S]{30,200}?)<\/strong>\s*<\/p>/i);
  if (strongInP) return stripTags(strongInP[1]);

  return null;
}

// ---------------------------------------------------------------------------
// Icon + background hints based on section type
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, string> = {
  hero: "🚀",
  problem_agitation: "⚠️",
  failed_solutions: "🚫",
  origin_story: "📖",
  solution_reveal: "💡",
  solution_introduction: "💡",
  how_it_works: "⚙️",
  mechanism: "⚙️",
  process_explanation: "🗺️",
  deliverables: "📦",
  offer_details: "🎁",
  feature_spotlight: "⭐",
  feature_deep_dive: "🔍",
  who_its_for: "👥",
  social_proof: "✅",
  founder_bio: "👤",
  comparison_table: "⚖️",
  competitive_positioning: "⚖️",
  faq: "❓",
  objection_handling: "🛡️",
  guarantee: "🔒",
  pricing: "💎",
  urgency: "⏰",
  final_cta: "👉",
  call_to_action: "👉",
  bonus: "🎉",
};

function backgroundFor(
  sectionType: string,
  index: number
): "light" | "dark" | "gradient" | "photo" {
  if (sectionType === "hero") return "photo";
  if (sectionType === "social_proof") return "gradient";
  if (sectionType === "guarantee") return "gradient";
  if (sectionType === "pricing") return "gradient";
  // Alternate for visual rhythm
  return index % 2 === 0 ? "dark" : "light";
}

// ---------------------------------------------------------------------------
// Main: enrich a section
// ---------------------------------------------------------------------------

export function enrichSection(
  raw: { id: string; type: string; title?: string; body_html: string },
  index: number
): EnrichedSection {
  const { h2, lead, rest: afterHero } = extractHeroSlice(raw.body_html);
  const { bullets, rest: afterBullets } = extractBullets(afterHero);
  const stats = extractStats(raw.body_html, raw.type);
  const testimonials = extractTestimonials(raw.body_html);
  const pullQuote = extractPullQuote(afterBullets);

  return {
    type: raw.type,
    id: raw.id,
    title: raw.title,
    h2,
    lead_paragraph: lead,
    body_html: afterBullets,
    bullets,
    stats,
    testimonials,
    pull_quote: pullQuote,
    suggested_icon: ICON_MAP[raw.type] ?? "📌",
    suggested_background: backgroundFor(raw.type, index),
    should_invert: index % 2 === 1,
  };
}

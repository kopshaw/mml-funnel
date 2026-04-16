/**
 * Image provider abstraction for funnel landing pages.
 *
 * Strategy:
 *   1. Unsplash API if UNSPLASH_ACCESS_KEY is set — real photography
 *      searchable by keyword
 *   2. DiceBear for avatars (keyless) — testimonial cards
 *   3. Gradient fallbacks — zero-cost baseline so the page always renders
 *
 * The copywriter outputs `image_query` hints for each section; this module
 * turns those hints into real image URLs.
 */

export interface ResolvedImage {
  url: string;
  alt: string;
  attribution?: { name: string; url: string }; // required by Unsplash TOS
  provider: "unsplash" | "dicebear" | "gradient";
}

// ---------------------------------------------------------------------------
// Unsplash
// ---------------------------------------------------------------------------

interface UnsplashPhoto {
  id: string;
  urls: { raw: string; full: string; regular: string; small: string; thumb: string };
  alt_description?: string | null;
  description?: string | null;
  user: { name: string; links: { html: string } };
  links: { html: string; download_location: string };
}

/**
 * Search Unsplash for a photo matching the query. Returns the best match.
 * On failure (no key, network error, no results) returns null so callers
 * can fall back to a gradient.
 */
export async function searchUnsplash(
  query: string,
  orientation: "landscape" | "portrait" | "squarish" = "landscape"
): Promise<ResolvedImage | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const params = new URLSearchParams({
      query,
      orientation,
      per_page: "1",
      content_filter: "high",
    });
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      // Cache for 1 hour — same query shouldn't hit the API repeatedly
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { results?: UnsplashPhoto[] };
    const photo = data.results?.[0];
    if (!photo) return null;

    // Unsplash TOS requires a "download" ping when using the photo in production
    // We fire and forget — failure doesn't matter
    fetch(`${photo.links.download_location}&client_id=${accessKey}`, {
      method: "GET",
    }).catch(() => {});

    return {
      url: photo.urls.regular,
      alt: photo.alt_description || photo.description || query,
      attribution: { name: photo.user.name, url: photo.user.links.html },
      provider: "unsplash",
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// DiceBear avatars (keyless, good for testimonial placeholders)
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic avatar URL from a name.
 * Uses DiceBear's `notionists` style which produces clean, human-like
 * illustrations that don't look AI-uncanny.
 */
export function avatarFor(name: string): string {
  const seed = encodeURIComponent(name.trim().toLowerCase());
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=2563eb,0891b2,059669,7c3aed,db2777,ea580c&radius=50`;
}

// ---------------------------------------------------------------------------
// Gradient fallback
// ---------------------------------------------------------------------------

const GRADIENTS = [
  "linear-gradient(135deg, #2563eb 0%, #0891b2 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
  "linear-gradient(135deg, #059669 0%, #2563eb 100%)",
  "linear-gradient(135deg, #db2777 0%, #7c3aed 100%)",
  "linear-gradient(135deg, #ea580c 0%, #db2777 100%)",
];

/** Stable gradient choice from a seed string. */
export function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function gradientImage(seed: string): ResolvedImage {
  return {
    url: "",
    alt: "",
    provider: "gradient",
  };
}

// ---------------------------------------------------------------------------
// Icon emoji for section types (keyless, universal)
// ---------------------------------------------------------------------------

export const SECTION_ICONS: Record<string, string> = {
  hero: "🚀",
  problem_agitation: "⚠️",
  origin_story: "📖",
  solution_reveal: "💡",
  how_it_works: "⚙️",
  mechanism: "⚙️",
  deliverables: "📦",
  feature_spotlight: "⭐",
  feature_deep_dive: "🔍",
  who_its_for: "👥",
  social_proof: "✅",
  founder_bio: "👤",
  comparison_table: "⚖️",
  failed_solutions: "❌",
  faq: "❓",
  objection_handling: "🛡️",
  guarantee: "🔒",
  pricing: "💎",
  offer_details: "🎁",
  process_explanation: "🗺️",
  urgency: "⏰",
  final_cta: "👉",
  call_to_action: "👉",
  bonus: "🎉",
};

// ---------------------------------------------------------------------------
// High-level: resolve an image for a section
// ---------------------------------------------------------------------------

/**
 * Given a section and the offer context, return the best image to use for
 * its hero area. Cascades: Unsplash → gradient.
 */
export async function resolveSectionImage(
  sectionType: string,
  imageQuery: string | undefined,
  fallbackQuery: string
): Promise<ResolvedImage> {
  // Sections that shouldn't have a photo (FAQ, pricing cards, etc.)
  const NO_IMAGE_TYPES = new Set([
    "faq",
    "pricing",
    "objection_handling",
    "call_to_action",
    "final_cta",
    "comparison_table",
  ]);
  if (NO_IMAGE_TYPES.has(sectionType)) {
    return { url: "", alt: "", provider: "gradient" };
  }

  const query = imageQuery || fallbackQuery;
  const result = await searchUnsplash(query);
  if (result) return result;

  return { url: "", alt: "", provider: "gradient" };
}

/**
 * Resolve the hero image for a funnel. Tries Unsplash using the offer_name
 * keywords, falls back to gradient.
 */
export async function resolveHeroImage(
  offerName: string,
  targetAudience: string
): Promise<ResolvedImage> {
  // Distill 2-4 keywords from the offer + audience for Unsplash
  const query = `${offerName.split(" ").slice(0, 3).join(" ")} professional business`;
  const result = await searchUnsplash(query, "landscape");
  if (result) return result;
  return { url: "", alt: "", provider: "gradient" };
}

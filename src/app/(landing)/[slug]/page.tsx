import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { LandingPageContent } from "@/components/landing/page-content";
import { AnalyticsTracker } from "@/components/landing/analytics-tracker";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function LandingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const search = await searchParams;
  const supabase = createAdminClient();

  // Find the funnel by landing page slug
  const { data: funnel } = await supabase
    .from("funnels")
    .select("*")
    .eq("landing_page_slug", slug)
    .eq("status", "active")
    .single() as { data: { id: string; name: string; description: string | null; offer_type: string; offer_price_cents: number } | null };

  if (!funnel) notFound();

  // Check for active A/B test on the landing page stage
  const { data: abTest } = await supabase
    .from("ab_tests")
    .select("*, ab_test_variants(*)")
    .eq("funnel_id", funnel.id)
    .eq("test_type", "landing_page")
    .eq("status", "running")
    .single() as { data: { ab_test_variants: Array<{ id: string; traffic_percentage: number; variant_content: unknown }> } | null };

  // Server-side variant assignment (cookie-based for consistency)
  let variant = null;
  if (abTest?.ab_test_variants?.length) {
    // Simple random assignment weighted by traffic_percentage
    const variants = abTest.ab_test_variants;
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const v of variants) {
      cumulative += v.traffic_percentage;
      if (rand <= cumulative) {
        variant = v;
        break;
      }
    }
    variant = variant || variants[0];
  }

  // Extract UTM parameters
  const utmParams = {
    utm_source: search.utm_source,
    utm_medium: search.utm_medium,
    utm_campaign: search.utm_campaign,
    utm_content: search.utm_content,
    utm_term: search.utm_term,
  };

  // Get variant content or default
  const content = variant?.variant_content as Record<string, string> | null;

  return (
    <>
      <AnalyticsTracker
        funnelId={funnel.id}
        pageSlug={slug}
        variantId={variant?.id}
      />
      <LandingPageContent
        funnel={funnel}
        content={content}
        variantId={variant?.id}
        utmParams={utmParams}
      />
    </>
  );
}

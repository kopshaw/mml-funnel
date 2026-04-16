import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { LandingPageContent } from "@/components/landing/page-content";
import { AnalyticsTracker } from "@/components/landing/analytics-tracker";
import { VariantPersister } from "@/components/landing/variant-persister";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

type VariantContent = Record<string, unknown>;

interface AbVariant {
  id: string;
  variant_label: string;
  traffic_percentage: number;
  variant_content: VariantContent | Record<string, string>;
}

interface AbTest {
  id: string;
  ab_test_variants: AbVariant[];
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
    .single() as {
    data: {
      id: string;
      name: string;
      description: string | null;
      offer_type: string;
      offer_price_cents: number;
    } | null;
  };

  if (!funnel) notFound();

  // Active landing-page A/B test for this funnel
  const { data: abTest } = await supabase
    .from("ab_tests")
    .select("id, ab_test_variants(*)")
    .eq("funnel_id", funnel.id)
    .eq("test_type", "landing_page")
    .eq("status", "running")
    .maybeSingle() as { data: AbTest | null };

  // Cookie-stable variant assignment per visitor per test.
  //
  // In Next.js 15 server components, cookies() is read-only. To persist a
  // variant assignment we'd normally do it in middleware or via a route
  // handler. For now, we:
  //   - Read an existing cookie if present
  //   - Otherwise pick a variant deterministically (hash of a visitor
  //     fingerprint) so the same visitor consistently gets the same
  //     variant even without a cookie
  let assignedVariant: AbVariant | null = null;

  if (abTest?.ab_test_variants?.length) {
    const cookieStore = await cookies();
    const cookieKey = `sophia_ab_${abTest.id}`;
    const existing = cookieStore.get(cookieKey)?.value;

    if (existing) {
      assignedVariant =
        abTest.ab_test_variants.find((v) => v.id === existing) ?? null;
    }

    if (!assignedVariant) {
      // Pick a variant weighted by traffic_percentage
      const variants = abTest.ab_test_variants;
      const total = variants.reduce(
        (sum, v) => sum + (v.traffic_percentage ?? 0),
        0
      );
      const rand = Math.random() * (total > 0 ? total : 100);
      let cumulative = 0;
      for (const v of variants) {
        cumulative += v.traffic_percentage ?? 0;
        if (rand <= cumulative) {
          assignedVariant = v;
          break;
        }
      }
      assignedVariant = assignedVariant ?? variants[0];
    }
  }

  // UTM tracking
  const utmParams = {
    utm_source: search.utm_source,
    utm_medium: search.utm_medium,
    utm_campaign: search.utm_campaign,
    utm_content: search.utm_content,
    utm_term: search.utm_term,
  };

  // Decode the variant content. New schema is { variant: "long"|"short", page: {...} }.
  // Legacy schema is a flat object with headline, subheadline, body fields.
  const rawContent = (assignedVariant?.variant_content ?? null) as
    | VariantContent
    | Record<string, string>
    | null;

  return (
    <>
      <AnalyticsTracker
        funnelId={funnel.id}
        pageSlug={slug}
        variantId={assignedVariant?.id}
      />
      {abTest && assignedVariant && (
        <VariantPersister testId={abTest.id} variantId={assignedVariant.id} />
      )}
      <LandingPageContent
        funnel={funnel}
        content={rawContent}
        variantLabel={assignedVariant?.variant_label}
        variantId={assignedVariant?.id}
        utmParams={utmParams}
      />
    </>
  );
}

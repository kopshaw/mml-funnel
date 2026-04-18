import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { LandingPageContent } from "@/components/landing/page-content";
import { AnalyticsTracker } from "@/components/landing/analytics-tracker";
import { VariantPersister } from "@/components/landing/variant-persister";
import { PreviewBanner } from "@/components/landing/preview-banner";
import { LongFormLayout } from "@/components/landing/long-form-layout";
import { resolveWorkspaceFromHost } from "@/lib/workspace-resolver";

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

  // Resolve workspace from Host header (subdomain or custom domain).
  // Null = main marketing site (backward-compat: serve any active funnel).
  const headerList = await headers();
  const workspace = await resolveWorkspaceFromHost(headerList.get("host"));

  // Find the funnel by landing page slug, scoped to the workspace if any.
  let query = supabase
    .from("funnels")
    .select("*")
    .eq("landing_page_slug", slug)
    .eq("status", "active");

  if (workspace) {
    query = query.eq("client_id", workspace.client_id);
  }

  const { data: funnel } = (await query.maybeSingle()) as {
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

  // Variant assignment precedence:
  //   1. ?variant=<id> or ?variant=long|short query param → preview override
  //      (doesn't persist a cookie so admins can toggle freely)
  //   2. Existing sophia_ab_<test_id> cookie → return visitor consistency
  //   3. Random weighted assignment → new visitor
  let assignedVariant: AbVariant | null = null;
  let isPreviewMode = false;

  if (abTest?.ab_test_variants?.length) {
    const variants = abTest.ab_test_variants;
    const previewParam = search.variant;

    if (previewParam) {
      // Match by id (exact) or by label (case-insensitive, "long"/"short")
      assignedVariant =
        variants.find((v) => v.id === previewParam) ??
        variants.find((v) => v.variant_label.toLowerCase().startsWith(previewParam.toLowerCase())) ??
        null;
      if (assignedVariant) isPreviewMode = true;
    }

    if (!assignedVariant) {
      const cookieStore = await cookies();
      const cookieKey = `sophia_ab_${abTest.id}`;
      const existing = cookieStore.get(cookieKey)?.value;

      if (existing) {
        assignedVariant = variants.find((v) => v.id === existing) ?? null;
      }
    }

    if (!assignedVariant) {
      // Weighted random for new visitor
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

  // Pull out brand + audience context for image queries (best-effort)
  const variantContent = (rawContent ?? {}) as {
    variant?: string;
    page?: { hero?: { headline?: string; subheadline?: string } } & Record<string, unknown>;
  };
  const isLongForm = variantContent.variant === "long" && !!variantContent.page;

  const preamble = (
    <>
      <AnalyticsTracker
        funnelId={funnel.id}
        pageSlug={slug}
        variantId={assignedVariant?.id}
      />
      {abTest && assignedVariant && !isPreviewMode && (
        <VariantPersister testId={abTest.id} variantId={assignedVariant.id} />
      )}
      {isPreviewMode && assignedVariant && abTest && (
        <PreviewBanner
          variantLabel={assignedVariant.variant_label}
          otherVariants={abTest.ab_test_variants.filter((v) => v.id !== assignedVariant!.id)}
          slug={slug}
        />
      )}
    </>
  );

  // Long-form is rendered by the async server component (prefetches images)
  if (isLongForm) {
    const longFormPage = variantContent.page as unknown as Parameters<typeof LongFormLayout>[0]["page"];
    return (
      <>
        {preamble}
        <LongFormLayout
          page={longFormPage}
          funnel={funnel}
          variantId={assignedVariant?.id}
          variantLabel={assignedVariant?.variant_label}
          utmParams={utmParams}
          brandName={funnel.name}
        />
      </>
    );
  }

  // Short-form + legacy go through the client component
  return (
    <>
      {preamble}
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

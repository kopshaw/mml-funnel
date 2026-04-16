import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Rocket } from "lucide-react";
import { getCampaignDashboard, type Timeframe } from "@/lib/queries/campaign-dashboard-queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { CampaignDashboard } from "@/components/campaign/campaign-dashboard";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tf?: string }>;
}

export default async function CampaignDashboardPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const tfParam = (sp.tf as Timeframe | undefined) ?? "30d";
  const validTf: Timeframe = ["7d", "30d", "lifetime"].includes(tfParam) ? tfParam : "30d";

  // Load brief metadata separately for header
  const admin = createAdminClient();
  const { data: brief } = await admin
    .from("campaign_briefs")
    .select("id, status, brand_name, offer_name, offer_type, offer_price_cents, funnel_id, funnels(landing_page_slug)")
    .eq("id", id)
    .single() as {
    data: {
      id: string;
      status: string;
      brand_name: string;
      offer_name: string;
      offer_type: string;
      offer_price_cents: number;
      funnel_id: string | null;
      funnels: { landing_page_slug: string | null } | null;
    } | null;
  };

  if (!brief) notFound();

  const dashboard = await getCampaignDashboard(id, validTf);
  if (!dashboard) notFound();

  const landingSlug = brief.funnels?.landing_page_slug ?? null;
  const priceDollars = (brief.offer_price_cents / 100).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        All Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {brief.offer_name}
            </h1>
            <StatusBadge status={brief.status} />
          </div>
          <p className="text-sm text-slate-400">
            {brief.brand_name} · {brief.offer_type.replace("_", " ")} · ${priceDollars}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {landingSlug && brief.status === "launched" && (
            <>
              <a
                href={`/${landingSlug}?variant=long`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-sm font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Long-form
              </a>
              <a
                href={`/${landingSlug}?variant=short`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-sm font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Short-form
              </a>
              <a
                href={`/${landingSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Live URL
              </a>
            </>
          )}
          {brief.status !== "launched" && (
            <Link
              href={`/campaigns/${brief.id}/review`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Rocket className="w-4 h-4" />
              Review &amp; Launch
            </Link>
          )}
        </div>
      </div>

      {/* Dashboard */}
      <CampaignDashboard
        data={dashboard}
        campaignId={brief.id}
        landingSlug={landingSlug}
        campaignStatus={brief.status}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-slate-700/50 text-slate-300" },
    generating: { label: "Generating", className: "bg-amber-500/15 text-amber-400" },
    review: { label: "Review", className: "bg-blue-500/15 text-blue-400" },
    approved: { label: "Approved", className: "bg-cyan-500/15 text-cyan-400" },
    launched: { label: "Launched", className: "bg-emerald-500/15 text-emerald-400" },
    archived: { label: "Archived", className: "bg-slate-700/50 text-slate-500" },
  };
  const c = config[status] ?? config.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

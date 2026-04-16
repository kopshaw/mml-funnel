import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, ExternalLink, Rocket, TrendingUp,
  Users, DollarSign, BarChart3, Target,
} from "lucide-react";
import { getCampaignDetail } from "@/lib/queries/campaign-detail-queries";
import { CampaignCommandCenter } from "@/components/campaign/campaign-command-center";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getCampaignDetail(id);

  if (!detail) notFound();

  const { brief, funnel, kpis, nodes, edges, history_by_node } = detail;
  const priceDollars = (brief.offer_price_cents / 100).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Back to dashboard */}
      <Link
        href={`/campaigns/${brief.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Dashboard
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

        {/* Quick CTAs */}
        {funnel?.landing_page_slug && brief.status === "launched" && (
          <div className="flex flex-wrap gap-2">
            <a
              href={`/${funnel.landing_page_slug}?variant=long`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Long-form
            </a>
            <a
              href={`/${funnel.landing_page_slug}?variant=short`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Short-form
            </a>
            <a
              href={`/${funnel.landing_page_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Live URL
            </a>
            {brief.status !== "launched" && (
              <Link
                href={`/campaigns/${brief.id}/review`}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Rocket className="w-3.5 h-3.5" />
                Review & Launch
              </Link>
            )}
          </div>
        )}

        {brief.status !== "launched" && (
          <Link
            href={`/campaigns/${brief.id}/review`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Rocket className="w-4 h-4" />
            Review & Launch
          </Link>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Revenue"
          value={`$${(kpis.total_revenue_cents / 100).toLocaleString()}`}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
        />
        <KpiCard
          icon={<Users className="w-4 h-4" />}
          label="Leads"
          value={kpis.total_leads.toLocaleString()}
          color="text-blue-400"
          bg="bg-blue-400/10"
        />
        <KpiCard
          icon={<BarChart3 className="w-4 h-4" />}
          label="Ad Spend"
          value={`$${(kpis.total_ad_spend_cents / 100).toLocaleString()}`}
          color="text-violet-400"
          bg="bg-violet-400/10"
        />
        <KpiCard
          icon={<Target className="w-4 h-4" />}
          label="ROAS"
          value={kpis.roas !== null ? `${kpis.roas.toFixed(2)}x` : "—"}
          color="text-amber-400"
          bg="bg-amber-400/10"
        />
      </div>

      {/* Empty state hint if no data */}
      {kpis.total_leads === 0 && brief.status === "launched" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-sm">
            <p className="text-amber-200 font-medium">Funnel is live but hasn&apos;t received traffic yet</p>
            <p className="text-amber-200/70 mt-0.5">
              Once visitors hit the landing page, each node below will populate with real metrics.
            </p>
          </div>
        </div>
      )}

      {/* Mind map command center */}
      <CampaignCommandCenter
        nodes={nodes}
        edges={edges}
        historyByNode={history_by_node}
        landingSlug={funnel?.landing_page_slug ?? null}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function KpiCard({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-lg ${bg} ${color}`}
        >
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

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

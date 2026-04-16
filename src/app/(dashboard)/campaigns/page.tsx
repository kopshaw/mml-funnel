import Link from "next/link";
import {
  Plus,
  Rocket,
  Calendar,
  Tag,
  ArrowRight,
  Megaphone,
  Building2,
  ExternalLink,
} from "lucide-react";
import { getCampaignBriefs, getCampaignBriefCounts } from "@/lib/queries/campaign-queries";

type CampaignStatus = "draft" | "generating" | "review" | "approved" | "launched" | "archived";

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  draft: {
    label: "Draft",
    bg: "bg-slate-700/50",
    text: "text-slate-300",
    dot: "bg-slate-400",
  },
  generating: {
    label: "Generating",
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  review: {
    label: "Review",
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    dot: "bg-blue-400",
  },
  approved: {
    label: "Approved",
    bg: "bg-cyan-500/15",
    text: "text-cyan-400",
    dot: "bg-cyan-400",
  },
  launched: {
    label: "Launched",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  archived: {
    label: "Archived",
    bg: "bg-slate-700/50",
    text: "text-slate-500",
    dot: "bg-slate-500",
  },
};

const offerTypeLabels: Record<string, string> = {
  low_ticket: "Low Ticket (<$500)",
  mid_ticket: "Mid Ticket ($500-$3k)",
  high_ticket: "High Ticket ($3k+)",
};

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dot} ${
          status === "generating" ? "animate-pulse" : ""
        }`}
      />
      {config.label}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
        <Megaphone className="h-7 w-7 text-slate-500" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-200">
        No campaigns yet
      </h3>
      <p className="mt-1.5 max-w-sm text-center text-sm text-slate-400">
        Create your first AI-powered campaign. We will generate your entire
        funnel, ad copy, and landing pages.
      </p>
      <Link
        href="/campaigns/new"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
      >
        <Plus className="h-4 w-4" />
        New Campaign
      </Link>
    </div>
  );
}

export default async function CampaignsPage() {
  const [campaigns, counts] = await Promise.all([
    getCampaignBriefs(),
    getCampaignBriefCounts(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Campaigns</h2>
          <p className="mt-1 text-sm text-slate-400">
            AI-generated funnels, landing pages, and ad creative for your
            clients.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* Status summary */}
      {counts.total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Draft", value: counts.draft, color: "text-slate-400" },
            { label: "Generating", value: counts.generating, color: "text-amber-400" },
            { label: "Review", value: counts.review, color: "text-blue-400" },
            { label: "Launched", value: counts.launched, color: "text-emerald-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
            >
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Grid */}
      {campaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="group relative rounded-xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-slate-700 hover:bg-slate-900/80"
            >
              {/* Clickable overlay that goes to the review page.
                  Stays underneath the View Live Funnel link via z-index. */}
              <Link
                href={`/campaigns/${campaign.id}/review`}
                aria-label={`Open ${campaign.offer_name}`}
                className="absolute inset-0 z-0 rounded-xl"
              />

              {/* Top row: name + status */}
              <div className="relative z-10 flex items-start justify-between gap-3 pointer-events-none">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <Rocket className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-100 group-hover:text-white">
                      {campaign.offer_name}
                    </h3>
                    <p className="text-xs text-slate-400">{campaign.brand_name}</p>
                  </div>
                </div>
                <StatusBadge status={campaign.status} />
              </div>

              {/* Details */}
              <div className="relative z-10 mt-4 space-y-2.5 pointer-events-none">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-slate-400">
                    {offerTypeLabels[campaign.offer_type] ?? campaign.offer_type}
                  </span>
                  <span className="ml-auto font-medium text-slate-200">
                    {formatPrice(campaign.offer_price_cents)}
                  </span>
                </div>
                {campaign.client?.name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-slate-400">{campaign.client.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-slate-400">
                    Created {formatDate(campaign.created_at)}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="relative z-10 mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                {campaign.status === "launched" && campaign.funnel?.landing_page_slug ? (
                  <a
                    href={`/${campaign.funnel.landing_page_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    View Live Funnel
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="pointer-events-none" />
                )}
                <span className="pointer-events-none inline-flex items-center gap-1 text-xs font-medium text-blue-400 opacity-0 transition-opacity group-hover:opacity-100">
                  View Campaign
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

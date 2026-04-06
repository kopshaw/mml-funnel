"use client";

import Link from "next/link";
import {
  Plus,
  Rocket,
  Calendar,
  Tag,
  ArrowRight,
  Megaphone,
} from "lucide-react";

type CampaignStatus = "draft" | "generating" | "review" | "launched";

interface Campaign {
  id: string;
  name: string;
  client: string;
  status: CampaignStatus;
  offerType: string;
  offerPrice: number;
  createdAt: string;
}

const statusConfig: Record<
  CampaignStatus,
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
  launched: {
    label: "Launched",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
};

const mockCampaigns: Campaign[] = [
  {
    id: "camp-001",
    name: "Q2 Agency Growth Funnel",
    client: "Metric Mentor Labs",
    status: "launched",
    offerType: "High Ticket ($3k+)",
    offerPrice: 4997,
    createdAt: "2026-03-15",
  },
  {
    id: "camp-002",
    name: "SaaS Free Trial Acquisition",
    client: "CloudSync Pro",
    status: "review",
    offerType: "Low Ticket (<$500)",
    offerPrice: 49,
    createdAt: "2026-03-28",
  },
  {
    id: "camp-003",
    name: "Coaching Program Launch",
    client: "Mindset Mastery Co",
    status: "generating",
    offerType: "Mid Ticket ($500-$3k)",
    offerPrice: 1497,
    createdAt: "2026-04-02",
  },
  {
    id: "camp-004",
    name: "E-Commerce Summer Promo",
    client: "Urban Essentials",
    status: "draft",
    offerType: "Low Ticket (<$500)",
    offerPrice: 79,
    createdAt: "2026-04-05",
  },
  {
    id: "camp-005",
    name: "Webinar Funnel Relaunch",
    client: "Metric Mentor Labs",
    status: "launched",
    offerType: "High Ticket ($3k+)",
    offerPrice: 7500,
    createdAt: "2026-02-10",
  },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const config = statusConfig[status];
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

export default function CampaignsPage() {
  const campaigns = mockCampaigns;

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

      {/* Campaign Grid */}
      {campaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="group rounded-xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-slate-700 hover:bg-slate-900/80"
            >
              {/* Top row: name + status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <Rocket className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-100 group-hover:text-white">
                      {campaign.name}
                    </h3>
                    <p className="text-xs text-slate-400">{campaign.client}</p>
                  </div>
                </div>
                <StatusBadge status={campaign.status} />
              </div>

              {/* Details */}
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-slate-400">{campaign.offerType}</span>
                  <span className="ml-auto font-medium text-slate-200">
                    {formatPrice(campaign.offerPrice)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-slate-400">
                    Created {formatDate(campaign.createdAt)}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-end border-t border-slate-800 pt-3">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 opacity-0 transition-opacity group-hover:opacity-100">
                  View Campaign
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

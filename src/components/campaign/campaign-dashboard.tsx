"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Users, BarChart3,
  Target, Network, ArrowRight, Bot, Clock, CheckCircle,
  AlertCircle, ExternalLink,
} from "lucide-react";
import type { CampaignDashboardData, Timeframe } from "@/lib/queries/campaign-dashboard-queries";

export function CampaignDashboard({
  data,
  campaignId,
  landingSlug,
  campaignStatus,
}: {
  data: CampaignDashboardData;
  campaignId: string;
  landingSlug: string | null;
  campaignStatus: string;
}) {
  return (
    <div className="space-y-6">
      {/* Timeframe toggle */}
      <TimeframeSwitcher current={data.timeframe} />

      {/* KPI cards with deltas */}
      <KpiRow kpis={data.kpis} />

      {/* Two-column: Revenue trend + Leads trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue trend" subtitle={rangeLabel(data.timeframe)}>
          <RevenueChart data={data.revenue_timeseries} />
        </ChartCard>
        <ChartCard title="Leads trend" subtitle={rangeLabel(data.timeframe)}>
          <LeadsChart data={data.leads_timeseries} />
        </ChartCard>
      </div>

      {/* Mind Map explore card */}
      <MindMapCard
        campaignId={campaignId}
        nodeCountHint={data.stage_conversion.length + data.top_ads.length + data.email_performance.length + data.variant_comparison.length}
      />

      {/* Two-column: Funnel conversion + A/B test */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Funnel conversion" subtitle="Drop-off at each stage">
          <StageChart stages={data.stage_conversion} />
        </ChartCard>
        <ChartCard title="Landing page A/B test" subtitle="Long-form vs short-form">
          <VariantComparison
            variants={data.variant_comparison}
            landingSlug={landingSlug}
          />
        </ChartCard>
      </div>

      {/* Top ads table */}
      <ChartCard title="Top ad creatives" subtitle="Ranked by click-through rate">
        <AdsTable ads={data.top_ads} />
      </ChartCard>

      {/* Email performance + SOPHIA activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Email sequence" subtitle="Open rate and click rate per step">
          <EmailTable emails={data.email_performance} />
        </ChartCard>
        <ChartCard
          title="SOPHIA activity"
          subtitle="Recent AI optimizations on this campaign"
        >
          <ActivityFeed activity={data.recent_activity} campaignId={campaignId} />
        </ChartCard>
      </div>

      {/* Empty state */}
      {data.kpis.leads === 0 && campaignStatus === "launched" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-sm">
            <p className="text-amber-200 font-medium">
              Waiting for traffic
            </p>
            <p className="text-amber-200/70 mt-0.5">
              Charts and metrics will populate as soon as visitors hit your landing page. Drive traffic with Meta Ads or share the live URL above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeframe switcher
// ---------------------------------------------------------------------------

function TimeframeSwitcher({ current }: { current: Timeframe }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setTimeframe(tf: Timeframe) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tf", tf);
    router.push(`?${params.toString()}`);
  }

  const options: { value: Timeframe; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "lifetime", label: "Lifetime" },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 w-fit">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setTimeframe(o.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            current === o.value
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function rangeLabel(tf: Timeframe): string {
  return tf === "7d" ? "Last 7 days" : tf === "30d" ? "Last 30 days" : "Since launch";
}

// ---------------------------------------------------------------------------
// KPI row
// ---------------------------------------------------------------------------

function KpiRow({ kpis }: { kpis: CampaignDashboardData["kpis"] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <KpiCard
        icon={<DollarSign className="w-4 h-4" />}
        label="Revenue"
        value={`$${(kpis.revenue_cents / 100).toLocaleString()}`}
        delta={kpis.revenue_delta_pct}
        color="emerald"
      />
      <KpiCard
        icon={<Users className="w-4 h-4" />}
        label="Leads"
        value={kpis.leads.toLocaleString()}
        delta={kpis.leads_delta_pct}
        color="blue"
      />
      <KpiCard
        icon={<BarChart3 className="w-4 h-4" />}
        label="Ad Spend"
        value={`$${(kpis.ad_spend_cents / 100).toLocaleString()}`}
        delta={kpis.ad_spend_delta_pct}
        color="violet"
        invertDelta
      />
      <KpiCard
        icon={<Target className="w-4 h-4" />}
        label="ROAS"
        value={kpis.roas !== null ? `${kpis.roas.toFixed(2)}x` : "—"}
        deltaAbsolute={kpis.roas_delta !== null ? `${kpis.roas_delta >= 0 ? "+" : ""}${kpis.roas_delta.toFixed(2)}x` : null}
        color="amber"
      />
      <KpiCard
        icon={<CheckCircle className="w-4 h-4" />}
        label="Close Rate"
        value={kpis.conversion_rate !== null ? `${(kpis.conversion_rate * 100).toFixed(1)}%` : "—"}
        deltaAbsolute={
          kpis.conversion_rate_delta !== null
            ? `${kpis.conversion_rate_delta >= 0 ? "+" : ""}${(kpis.conversion_rate_delta * 100).toFixed(1)}pt`
            : null
        }
        color="cyan"
      />
    </div>
  );
}

const KPI_COLORS: Record<string, { icon: string; bg: string }> = {
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-400/10" },
  blue: { icon: "text-blue-400", bg: "bg-blue-400/10" },
  violet: { icon: "text-violet-400", bg: "bg-violet-400/10" },
  amber: { icon: "text-amber-400", bg: "bg-amber-400/10" },
  cyan: { icon: "text-cyan-400", bg: "bg-cyan-400/10" },
};

function KpiCard({
  icon,
  label,
  value,
  delta,
  deltaAbsolute,
  color,
  invertDelta = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number | null;
  deltaAbsolute?: string | null;
  color: string;
  invertDelta?: boolean;
}) {
  const c = KPI_COLORS[color] ?? KPI_COLORS.blue;
  const hasDelta = delta !== undefined && delta !== null;
  const isPositive = hasDelta ? delta! >= 0 : false;
  const goodDelta = invertDelta ? !isPositive : isPositive;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${c.bg} ${c.icon}`}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {hasDelta && (
        <div
          className={`mt-1 flex items-center gap-1 text-xs ${
            goodDelta ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{delta! >= 0 ? "+" : ""}{delta!.toFixed(0)}% vs prior period</span>
        </div>
      )}
      {!hasDelta && deltaAbsolute && (
        <div
          className={`mt-1 flex items-center gap-1 text-xs ${
            deltaAbsolute.startsWith("+") || deltaAbsolute.startsWith("0")
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          <span>{deltaAbsolute} vs prior</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mind map card
// ---------------------------------------------------------------------------

function MindMapCard({ campaignId, nodeCountHint }: { campaignId: string; nodeCountHint: number }) {
  return (
    <Link
      href={`/campaigns/${campaignId}/map`}
      className="group relative overflow-hidden block rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/60 via-slate-900 to-slate-950 p-6 md:p-8 transition-all hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20"
    >
      <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Command Center
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
            Explore the campaign visually
          </h3>
          <p className="text-slate-300 max-w-xl leading-relaxed">
            See every node in this funnel — ads, landing pages, emails, SMS, AI agent, pipeline stages, booking. Click any node to drill into content, live metrics, and SOPHIA's optimization history.
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Real-time health indicators
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              {nodeCountHint > 0 ? `${nodeCountHint}+ nodes` : "Node-level metrics"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Agent change log
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 group-hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors">
            Open Mind Map
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>

      {/* Decorative node pattern */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 hidden md:block pointer-events-none">
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-16 h-16 rounded-xl bg-blue-400 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Chart card wrapper
// ---------------------------------------------------------------------------

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function RevenueChart({ data }: { data: { date: string; revenue_cents: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-500">
        No revenue data yet
      </div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            stroke="#475569"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${(v / 100).toLocaleString()}`}
            stroke="#475569"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              return (
                <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 shadow-lg">
                  <p className="text-xs text-slate-400">
                    {new Date(payload[0].payload.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-semibold text-emerald-400">
                    ${((payload[0].value as number) / 100).toLocaleString()}
                  </p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="revenue_cents" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function LeadsChart({ data }: { data: { date: string; leads: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-500">
        No lead data yet
      </div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            stroke="#475569"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="#475569"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={30}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              return (
                <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 shadow-lg">
                  <p className="text-xs text-slate-400">
                    {new Date(payload[0].payload.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-semibold text-blue-400">
                    {payload[0].value} leads
                  </p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fill="url(#leadsGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StageChart({ stages }: { stages: CampaignDashboardData["stage_conversion"] }) {
  if (stages.length === 0 || stages.every((s) => s.count === 0)) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-500">
        No pipeline events yet
      </div>
    );
  }

  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-2 py-2">
      {stages.map((s) => {
        const width = (s.count / max) * 100;
        return (
          <div key={s.stage_order}>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-slate-300 font-medium">{s.stage_name}</span>
              <span className="text-slate-400">
                {s.count.toLocaleString()}
                {s.rate_from_previous !== null && (
                  <span className="text-slate-500 ml-2">
                    ({(s.rate_from_previous * 100).toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="h-6 rounded bg-slate-800 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                style={{ width: `${Math.max(width, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VariantComparison({
  variants,
  landingSlug,
}: {
  variants: CampaignDashboardData["variant_comparison"];
  landingSlug: string | null;
}) {
  if (variants.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-500">
        No A/B test running
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {variants.map((v, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-800 bg-slate-950 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${
                  v.variant_label === "Long-form"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-cyan-500/20 text-cyan-400"
                }`}
              >
                {v.variant_label[0]}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{v.variant_label}</p>
                {v.is_control && (
                  <p className="text-xs text-slate-500">Control</p>
                )}
              </div>
            </div>
            {landingSlug && (
              <a
                href={`/${landingSlug}?variant=${v.variant_label.toLowerCase().split("-")[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Preview
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Visits</p>
              <p className="font-semibold text-white">{v.impressions.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Opt-ins</p>
              <p className="font-semibold text-white">{v.conversions.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Conv. Rate</p>
              <p className="font-semibold text-white">{(v.conversion_rate * 100).toFixed(2)}%</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdsTable({ ads }: { ads: CampaignDashboardData["top_ads"] }) {
  if (ads.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-slate-500">
        No ads yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
            <th className="py-2 font-medium">Headline</th>
            <th className="py-2 font-medium text-right">Impressions</th>
            <th className="py-2 font-medium text-right">Clicks</th>
            <th className="py-2 font-medium text-right">CTR</th>
            <th className="py-2 font-medium text-right">Spend</th>
            <th className="py-2 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => (
            <tr key={ad.id} className="border-b border-slate-800/60 last:border-0">
              <td className="py-3 text-slate-200 truncate max-w-xs">{ad.headline}</td>
              <td className="py-3 text-right text-slate-300">{ad.impressions.toLocaleString()}</td>
              <td className="py-3 text-right text-slate-300">{ad.clicks.toLocaleString()}</td>
              <td className="py-3 text-right font-medium text-slate-200">
                {(ad.ctr * 100).toFixed(2)}%
              </td>
              <td className="py-3 text-right text-slate-300">
                ${(ad.spend_cents / 100).toLocaleString()}
              </td>
              <td className="py-3 text-right">
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                    ad.status === "active"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-slate-700/50 text-slate-400"
                  }`}
                >
                  {ad.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmailTable({ emails }: { emails: CampaignDashboardData["email_performance"] }) {
  if (emails.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-slate-500">
        No email steps yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {emails.map((e) => (
        <div key={e.step_order} className="rounded-lg bg-slate-950 border border-slate-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Step {e.step_order}</p>
              <p className="text-sm font-medium text-white truncate">{e.subject}</p>
            </div>
            <span className="shrink-0 text-xs text-slate-400">
              {e.sent.toLocaleString()} sent
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-500">Open rate</p>
              <p className="font-semibold text-emerald-400">
                {(e.open_rate * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-slate-500">Click rate</p>
              <p className="font-semibold text-blue-400">
                {(e.click_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityFeed({
  activity,
  campaignId,
}: {
  activity: CampaignDashboardData["recent_activity"];
  campaignId: string;
}) {
  if (activity.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-center">
        <Bot className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-sm text-slate-500">No SOPHIA activity yet</p>
        <p className="text-xs text-slate-600 mt-1 max-w-xs">
          Once the funnel gets traffic, SOPHIA's optimizations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activity.slice(0, 5).map((a) => {
        const statusColor: Record<string, string> = {
          pending: "text-amber-400",
          approved: "text-blue-400",
          executing: "text-cyan-400",
          executed: "text-emerald-400",
          failed: "text-red-400",
          reverted: "text-slate-400",
        };
        return (
          <div key={a.id} className="rounded-lg bg-slate-950 border border-slate-800 p-3">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <p className="text-sm font-medium text-white truncate">
                  {a.action_type.replace(/_/g, " ")}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-medium ${statusColor[a.status] ?? "text-slate-400"}`}>
                {a.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2 leading-snug">{a.diagnosis}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{new Date(a.created_at).toLocaleString()}</span>
            </div>
          </div>
        );
      })}
      <Link
        href={`/campaigns/${campaignId}/map`}
        className="block text-center text-xs text-blue-400 hover:text-blue-300 pt-2"
      >
        View full activity in Mind Map →
      </Link>
    </div>
  );
}

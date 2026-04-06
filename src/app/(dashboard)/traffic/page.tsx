import {
  BarChart3,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const trafficSources = [
  {
    source: "Facebook Ads",
    visits: 12450,
    leads: 387,
    spend: "$8,240",
    cpl: "$21.29",
    convRate: "3.1%",
    trend: "up" as const,
  },
  {
    source: "Google Ads",
    visits: 8320,
    leads: 298,
    spend: "$6,180",
    cpl: "$20.74",
    convRate: "3.6%",
    trend: "up" as const,
  },
  {
    source: "Instagram Ads",
    visits: 5640,
    leads: 156,
    spend: "$4,120",
    cpl: "$26.41",
    convRate: "2.8%",
    trend: "down" as const,
  },
  {
    source: "YouTube Ads",
    visits: 3210,
    leads: 89,
    spend: "$2,950",
    cpl: "$33.15",
    convRate: "2.8%",
    trend: "up" as const,
  },
  {
    source: "Organic Search",
    visits: 4870,
    leads: 214,
    spend: "$0",
    cpl: "$0.00",
    convRate: "4.4%",
    trend: "up" as const,
  },
  {
    source: "Direct / Referral",
    visits: 2190,
    leads: 103,
    spend: "$0",
    cpl: "$0.00",
    convRate: "4.7%",
    trend: "up" as const,
  },
];

const campaigns = [
  {
    name: "VSL Retargeting - Warm",
    platform: "Facebook",
    status: "Active",
    impressions: "142K",
    clicks: "3,840",
    ctr: "2.7%",
    spend: "$2,180",
    conversions: 94,
    cpa: "$23.19",
  },
  {
    name: "High-Ticket Search",
    platform: "Google",
    status: "Active",
    impressions: "89K",
    clicks: "2,140",
    ctr: "2.4%",
    spend: "$1,960",
    conversions: 72,
    cpa: "$27.22",
  },
  {
    name: "Webinar Promo - Cold",
    platform: "Facebook",
    status: "Active",
    impressions: "215K",
    clicks: "4,620",
    ctr: "2.1%",
    spend: "$3,100",
    conversions: 118,
    cpa: "$26.27",
  },
  {
    name: "Lead Magnet - Story Ads",
    platform: "Instagram",
    status: "Paused",
    impressions: "78K",
    clicks: "1,560",
    ctr: "2.0%",
    spend: "$1,240",
    conversions: 41,
    cpa: "$30.24",
  },
  {
    name: "Brand Awareness - Video",
    platform: "YouTube",
    status: "Active",
    impressions: "310K",
    clicks: "2,480",
    ctr: "0.8%",
    spend: "$2,950",
    conversions: 89,
    cpa: "$33.15",
  },
  {
    name: "Retargeting - Cart Abandon",
    platform: "Google",
    status: "Active",
    impressions: "52K",
    clicks: "1,840",
    ctr: "3.5%",
    spend: "$980",
    conversions: 63,
    cpa: "$15.56",
  },
];

const summaryCards = [
  {
    label: "Total Visits",
    value: "36,680",
    change: "+14.2%",
    trend: "up" as const,
    icon: MousePointerClick,
  },
  {
    label: "Total Ad Spend",
    value: "$21,490",
    change: "+6.8%",
    trend: "up" as const,
    icon: DollarSign,
  },
  {
    label: "Avg. CPL",
    value: "$17.23",
    change: "-4.1%",
    trend: "up" as const,
    icon: TrendingUp,
  },
  {
    label: "Blended ROAS",
    value: "8.57x",
    change: "+2.3%",
    trend: "up" as const,
    icon: BarChart3,
  },
];

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-400",
  Paused: "bg-amber-500/10 text-amber-400",
};

export default function TrafficPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Traffic & Ads</h2>
        <p className="mt-1 text-sm text-slate-400">
          Analyze traffic sources, ad performance, and campaign ROI.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">
                  {card.label}
                </p>
                <Icon className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-100">
                {card.value}
              </p>
              <div className="mt-1 flex items-center gap-1">
                {card.trend === "up" ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                )}
                <span
                  className={`text-xs font-medium ${
                    card.trend === "up" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {card.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ad Spend Over Time Placeholder */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-base font-semibold text-slate-100">
          Ad Spend Over Time
        </h3>
        <p className="mt-1 text-sm text-slate-400">Daily spend by platform</p>
        <div className="mt-6 flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/30">
          <div className="text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-2 text-sm text-slate-500">
              Spend chart coming soon
            </p>
          </div>
        </div>
      </div>

      {/* Traffic Sources */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5">
          <h3 className="text-base font-semibold text-slate-100">
            Traffic Sources
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Performance breakdown by source
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3 text-right">Visits</th>
                <th className="px-5 py-3 text-right">Leads</th>
                <th className="px-5 py-3 text-right">Spend</th>
                <th className="px-5 py-3 text-right">CPL</th>
                <th className="px-5 py-3 text-right">Conv. Rate</th>
                <th className="px-5 py-3 text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {trafficSources.map((source) => (
                <tr
                  key={source.source}
                  className="text-sm transition-colors hover:bg-slate-800/40"
                >
                  <td className="px-5 py-3 font-medium text-slate-200">
                    {source.source}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {source.visits.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {source.leads.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {source.spend}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {source.cpl}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {source.convRate}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {source.trend === "up" ? (
                      <ArrowUpRight className="ml-auto h-4 w-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="ml-auto h-4 w-4 text-red-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Performance */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Campaign Performance
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Active and recent campaigns
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View in Ads Manager
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Platform</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Impressions</th>
                <th className="px-5 py-3 text-right">Clicks</th>
                <th className="px-5 py-3 text-right">CTR</th>
                <th className="px-5 py-3 text-right">Spend</th>
                <th className="px-5 py-3 text-right">Conv.</th>
                <th className="px-5 py-3 text-right">CPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.name}
                  className="text-sm transition-colors hover:bg-slate-800/40"
                >
                  <td className="px-5 py-3 font-medium text-slate-200">
                    {campaign.name}
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {campaign.platform}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[campaign.status]}`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {campaign.impressions}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {campaign.clicks}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {campaign.ctr}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {campaign.spend}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {campaign.conversions}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {campaign.cpa}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

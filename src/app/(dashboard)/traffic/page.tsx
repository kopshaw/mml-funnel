import {
  BarChart3,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  ExternalLink,
  ArrowUpRight,
  Inbox,
} from "lucide-react";
import {
  getTrafficSources,
  getCampaignPerformance,
  getSpendTimeSeries,
} from "@/lib/queries/traffic-queries";
import { EmptyState } from "@/components/dashboard/empty-state";

export default async function TrafficPage() {
  const [sources, campaigns, spendSeries] = await Promise.all([
    getTrafficSources(),
    getCampaignPerformance(),
    getSpendTimeSeries(),
  ]);

  // Compute summary values from real data
  const totalVisits = sources.reduce((sum, s) => sum + s.count, 0);
  const totalSpendCents = campaigns.reduce((sum, c) => sum + c.spend_cents, 0);
  const totalSpendDollars = totalSpendCents / 100;
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
  const avgCPL = totalLeads > 0 ? (totalSpendDollars / totalLeads) : 0;
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);

  const summaryCards = [
    {
      label: "Total Visits",
      value: totalVisits.toLocaleString(),
      icon: MousePointerClick,
    },
    {
      label: "Total Ad Spend",
      value: `$${totalSpendDollars.toLocaleString()}`,
      icon: DollarSign,
    },
    {
      label: "Avg. CPL",
      value: `$${avgCPL.toFixed(2)}`,
      icon: TrendingUp,
    },
    {
      label: "Total Conversions",
      value: totalConversions.toLocaleString(),
      icon: BarChart3,
    },
  ];

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
            </div>
          );
        })}
      </div>

      {/* Ad Spend Over Time */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-base font-semibold text-slate-100">
          Ad Spend Over Time
        </h3>
        <p className="mt-1 text-sm text-slate-400">Daily spend (last 30 days)</p>
        {spendSeries.length === 0 ? (
          <div className="mt-6 flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/30">
            <div className="text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-2 text-sm text-slate-500">
                No spend data yet
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <div className="flex items-end gap-1 h-48">
              {spendSeries.map((day: any) => {
                const maxSpend = Math.max(...spendSeries.map((d: any) => d.spend_cents));
                const heightPct = maxSpend > 0 ? (day.spend_cents / maxSpend) * 100 : 0;
                return (
                  <div
                    key={day.date}
                    className="flex-1 min-w-[8px] bg-blue-500/60 rounded-t hover:bg-blue-400/80 transition-colors"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                    title={`${day.date}: $${(day.spend_cents / 100).toFixed(2)}`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Traffic Sources */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5">
          <h3 className="text-base font-semibold text-slate-100">
            Traffic Sources
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Contacts by source
          </p>
        </div>
        {sources.length === 0 ? (
          <EmptyState
            title="No traffic data yet"
            description="Traffic source data will appear here once contacts start coming in."
            icon={Inbox}
            className="border-0 rounded-t-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3 text-right">Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sources.map((source) => (
                  <tr
                    key={source.source}
                    className="text-sm transition-colors hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-3 font-medium text-slate-200">
                      {source.source}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-300">
                      {source.count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                Ad metrics by campaign
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
        {campaigns.length === 0 ? (
          <EmptyState
            title="No campaign data yet"
            description="Campaign performance data will appear here once your ads start running."
            icon={Inbox}
            className="border-0 rounded-t-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Campaign ID</th>
                  <th className="px-5 py-3 text-right">Impressions</th>
                  <th className="px-5 py-3 text-right">Clicks</th>
                  <th className="px-5 py-3 text-right">CTR</th>
                  <th className="px-5 py-3 text-right">Spend</th>
                  <th className="px-5 py-3 text-right">Leads</th>
                  <th className="px-5 py-3 text-right">CPL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {campaigns.map((campaign) => {
                  const ctr = campaign.impressions > 0
                    ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1)
                    : "0.0";
                  const cpl = campaign.leads > 0
                    ? (campaign.spend_cents / 100 / campaign.leads).toFixed(2)
                    : "N/A";
                  return (
                    <tr
                      key={campaign.meta_campaign_id}
                      className="text-sm transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-3 font-medium text-slate-200">
                        {campaign.meta_campaign_id}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300">
                        {campaign.impressions.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300">
                        {campaign.clicks.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300">
                        {ctr}%
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300">
                        ${(campaign.spend_cents / 100).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300">
                        {campaign.leads.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300">
                        {cpl === "N/A" ? cpl : `$${cpl}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { Inbox } from "lucide-react";
import {
  getRevenueKPIs,
  getRevenueByFunnel,
  getClosedDeals,
} from "@/lib/queries/revenue-queries";
import { EmptyState } from "@/components/dashboard/empty-state";

export default async function RevenuePage() {
  const [kpis, funnelRevenue, deals] = await Promise.all([
    getRevenueKPIs(),
    getRevenueByFunnel(),
    getClosedDeals(undefined, 20),
  ]);

  const totalRevenueDollars = kpis.totalRevenue / 100;
  const avgDealDollars = kpis.avgDealSize / 100;
  const cacDollars = kpis.estimatedCAC / 100;

  // Compute max revenue for percentage bars
  const maxFunnelRevenue = funnelRevenue.length > 0
    ? Math.max(...funnelRevenue.map((f: any) => f.revenue))
    : 1;

  const kpiCards = [
    {
      label: "Total Revenue",
      value: `$${totalRevenueDollars.toLocaleString()}`,
      positive: true,
    },
    {
      label: "Avg Deal Size",
      value: `$${avgDealDollars.toLocaleString()}`,
      positive: true,
    },
    {
      label: "Total Deals",
      value: kpis.dealCount.toString(),
      positive: true,
    },
    {
      label: "Est. CAC",
      value: `$${cacDollars.toLocaleString()}`,
      positive: true,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Revenue</h1>
      <p className="text-slate-400 mb-6">
        Track revenue, ROAS, and deal performance across all funnels.
      </p>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-400">{kpi.label}</p>
            <p className="text-3xl font-bold text-white mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue by Funnel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">
          Revenue by Funnel
        </h2>
        {funnelRevenue.length === 0 ? (
          <EmptyState
            title="No revenue data yet"
            description="Revenue breakdowns will appear here once deals start closing."
            icon={Inbox}
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div className="space-y-4">
            {funnelRevenue.map((f: any) => {
              const revDollars = f.revenue / 100;
              const pct = Math.round((f.revenue / maxFunnelRevenue) * 100);
              return (
                <div key={f.funnelId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">
                      {f.funnelName}
                    </span>
                    <span className="text-sm font-medium text-white">
                      ${revDollars.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Closed Deals Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Recent Closed Deals
        </h2>
        {deals.length === 0 ? (
          <EmptyState
            title="No closed deals yet"
            description="Closed deals will appear here as your pipeline converts."
            icon={Inbox}
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-sm font-medium text-slate-400 pb-3">
                    Contact
                  </th>
                  <th className="text-right text-sm font-medium text-slate-400 pb-3">
                    Amount
                  </th>
                  <th className="text-right text-sm font-medium text-slate-400 pb-3">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal: any) => {
                  const contactName = [
                    deal.contact.first_name,
                    deal.contact.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Unknown";
                  const amountDollars = deal.amount_cents / 100;
                  return (
                    <tr
                      key={deal.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30"
                    >
                      <td className="py-3">
                        <p className="text-sm font-medium text-white">
                          {contactName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {deal.contact.email}
                        </p>
                      </td>
                      <td className="py-3 text-sm text-white text-right font-medium">
                        ${amountDollars.toLocaleString()}
                      </td>
                      <td className="py-3 text-sm text-slate-400 text-right">
                        {deal.occurred_at
                          ? new Date(deal.occurred_at).toLocaleDateString()
                          : "N/A"}
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

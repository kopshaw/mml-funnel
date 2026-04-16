import {
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Inbox,
} from "lucide-react";
import { getOverviewKPIs, getRecentActivity, getRevenueTimeSeries, getPipelineDistribution } from "@/lib/queries/overview-queries";
import { EmptyState } from "@/components/dashboard/empty-state";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";

const activityTypeColors: Record<string, string> = {
  healing: "bg-violet-500",
  lead: "bg-blue-500",
  revenue: "bg-emerald-500",
  alert: "bg-amber-500",
  funnel: "bg-cyan-500",
  action: "bg-violet-500",
};

export default async function OverviewPage() {
  const [kpis, recentActivity, revenueData, pipelineData] = await Promise.all([
    getOverviewKPIs(),
    getRecentActivity(undefined, 10),
    getRevenueTimeSeries(undefined, 30),
    getPipelineDistribution(),
  ]);

  const totalRevenueDollars = kpis.totalRevenue / 100;
  const adSpendDollars = kpis.adSpend / 100;
  const roas = adSpendDollars > 0 ? (totalRevenueDollars / adSpendDollars).toFixed(2) : "0.00";
  const conversionRate = kpis.totalLeads > 0
    ? ((kpis.conversions / kpis.totalLeads) * 100).toFixed(1)
    : "0.0";

  const kpiCards = [
    {
      label: "Total Revenue",
      value: `$${totalRevenueDollars.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
    },
    {
      label: "Ad Spend",
      value: `$${adSpendDollars.toLocaleString()}`,
      icon: BarChart3,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      label: "ROAS",
      value: `${roas}x`,
      icon: TrendingUp,
      color: "text-violet-400",
      bgColor: "bg-violet-400/10",
    },
    {
      label: "Total Leads",
      value: kpis.totalLeads.toLocaleString(),
      icon: Users,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: Target,
      color: "text-cyan-400",
      bgColor: "bg-cyan-400/10",
    },
    {
      label: "Active Funnels",
      value: kpis.activeFunnels.toString(),
      icon: Activity,
      color: "text-pink-400",
      bgColor: "bg-pink-400/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">SOPHIA Overview</h2>
        <p className="mt-1 text-sm text-slate-400">
          High-level performance across all funnels and campaigns.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">
                  {kpi.label}
                </p>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.bgColor}`}
                >
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-100">
                {kpi.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Two-column section: Revenue chart + Pipeline chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-base font-semibold text-slate-100">
            Revenue Trend
          </h3>
          <p className="mt-1 text-sm text-slate-400">Last 30 days</p>
          <div className="mt-4">
            <RevenueChart data={revenueData} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-base font-semibold text-slate-100">
            Pipeline Distribution
          </h3>
          <p className="mt-1 text-sm text-slate-400">By qualification status</p>
          <div className="mt-4">
            <PipelineChart data={pipelineData} />
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-base font-semibold text-slate-100">
          Recent Activity
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Latest events across all funnels
        </p>

        {recentActivity.length === 0 ? (
          <EmptyState
            title="No recent activity"
            description="Activity from optimizations and alerts will appear here as your funnels run."
            icon={Inbox}
            className="mt-4 border-0 bg-transparent py-8"
          />
        ) : (
          <div className="mt-4 divide-y divide-slate-800">
            {recentActivity.map((item: any, idx: number) => (
              <div
                key={item.id ?? idx}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activityTypeColors[item._type] ?? "bg-slate-500"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">
                    {item._type === "action"
                      ? item.action_type?.replace(/_/g, " ") ?? "Optimization"
                      : item.title ?? "Alert"}
                  </p>
                  <p className="truncate text-sm text-slate-400">
                    {item._type === "action"
                      ? item.diagnosis ?? item.description ?? ""
                      : item.message ?? ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString()
                    : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

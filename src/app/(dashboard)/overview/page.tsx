import {
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const kpiCards = [
  {
    label: "Total Revenue",
    value: "$184,320",
    change: "+12.5%",
    trend: "up" as const,
    icon: DollarSign,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
  },
  {
    label: "Ad Spend",
    value: "$23,450",
    change: "+8.2%",
    trend: "up" as const,
    icon: BarChart3,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    label: "ROAS",
    value: "7.86x",
    change: "+3.1%",
    trend: "up" as const,
    icon: TrendingUp,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
  },
  {
    label: "Total Leads",
    value: "1,247",
    change: "-2.4%",
    trend: "down" as const,
    icon: Users,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
  },
  {
    label: "Conversion Rate",
    value: "4.8%",
    change: "+0.6%",
    trend: "up" as const,
    icon: Target,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
  },
  {
    label: "Active Funnels",
    value: "12",
    change: "+2",
    trend: "up" as const,
    icon: Activity,
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
  },
];

const recentActivity = [
  {
    action: "Self-healing triggered",
    detail: "VSL High-Ticket Closer - CTA button color changed",
    time: "12 min ago",
    type: "healing" as const,
  },
  {
    action: "New lead captured",
    detail: "john.smith@example.com via Free Audit funnel",
    time: "28 min ago",
    type: "lead" as const,
  },
  {
    action: "Revenue milestone",
    detail: "Webinar Ops Accelerator crossed $50K MRR",
    time: "1 hr ago",
    type: "revenue" as const,
  },
  {
    action: "Alert resolved",
    detail: "Facebook Ads API reconnected successfully",
    time: "2 hr ago",
    type: "alert" as const,
  },
  {
    action: "Funnel published",
    detail: "Retainer Upsell Sequence moved to Active",
    time: "3 hr ago",
    type: "funnel" as const,
  },
  {
    action: "Conversation closed",
    detail: "Deal won: $12,500 from Discovery Call Booking",
    time: "4 hr ago",
    type: "revenue" as const,
  },
];

const activityTypeColors: Record<string, string> = {
  healing: "bg-violet-500",
  lead: "bg-blue-500",
  revenue: "bg-emerald-500",
  alert: "bg-amber-500",
  funnel: "bg-cyan-500",
};

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Overview</h2>
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
              <div className="mt-1 flex items-center gap-1">
                {kpi.trend === "up" ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-400" />
                )}
                <span
                  className={`text-sm font-medium ${
                    kpi.trend === "up" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {kpi.change}
                </span>
                <span className="text-sm text-slate-500">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column section: chart placeholder + activity feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend Chart Placeholder */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-base font-semibold text-slate-100">
            Revenue Trend
          </h3>
          <p className="mt-1 text-sm text-slate-400">Last 30 days</p>
          <div className="mt-6 flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/30">
            <div className="text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-2 text-sm text-slate-500">
                Revenue chart coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline Distribution Placeholder */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-base font-semibold text-slate-100">
            Pipeline Distribution
          </h3>
          <p className="mt-1 text-sm text-slate-400">By funnel stage</p>
          <div className="mt-6 flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/30">
            <div className="text-center">
              <Target className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-2 text-sm text-slate-500">
                Pipeline chart coming soon
              </p>
            </div>
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

        <div className="mt-4 divide-y divide-slate-800">
          {recentActivity.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activityTypeColors[item.type]}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">
                  {item.action}
                </p>
                <p className="truncate text-sm text-slate-400">{item.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-500">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

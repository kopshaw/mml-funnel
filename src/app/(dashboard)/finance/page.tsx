import Link from "next/link";
import {
  DollarSign, TrendingUp, TrendingDown, AlertCircle, Bot,
  Clock, Activity, Zap, Wallet, Building2, ExternalLink,
} from "lucide-react";
import { getFinanceDashboard } from "@/lib/queries/finance-queries";

export default async function FinancePage() {
  const data = await getFinanceDashboard();
  const { totals, clients, recent_insights, active_overrides, cost_by_provider_30d } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Finance & CFO</h1>
          <p className="text-sm text-slate-400 mt-1">
            Per-client cost vs revenue, AI spend tracking, and auto model-tier decisions.
          </p>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <TotalCard
          icon={<Wallet className="w-4 h-4" />}
          label="AI Spend (30d)"
          value={`$${(totals.total_cost_30d_cents / 100).toFixed(2)}`}
          subtitle={`Last 7d: $${(totals.total_cost_7d_cents / 100).toFixed(2)}`}
          color="violet"
        />
        <TotalCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Revenue (30d)"
          value={`$${(totals.total_revenue_30d_cents / 100).toFixed(0)}`}
          subtitle={`Last 7d: $${(totals.total_revenue_7d_cents / 100).toFixed(0)}`}
          color="emerald"
        />
        <TotalCard
          icon={totals.total_margin_30d_cents >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          label="Margin (30d)"
          value={`$${(totals.total_margin_30d_cents / 100).toFixed(0)}`}
          subtitle={
            totals.total_revenue_30d_cents > 0
              ? `${((totals.total_margin_30d_cents / totals.total_revenue_30d_cents) * 100).toFixed(0)}% margin`
              : "No revenue yet"
          }
          color={totals.total_margin_30d_cents >= 0 ? "emerald" : "red"}
        />
        <TotalCard
          icon={<Building2 className="w-4 h-4" />}
          label="Active Clients"
          value={totals.active_clients.toString()}
          subtitle="Workspaces running"
          color="blue"
        />
        <TotalCard
          icon={<Zap className="w-4 h-4" />}
          label="Auto Overrides"
          value={totals.active_overrides.toString()}
          subtitle={totals.active_overrides === 0 ? "No demotions active" : "CFO-pinned models"}
          color="amber"
        />
      </div>

      {/* Per-client table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-white">Per-client financials</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cost, revenue, margin, budget utilization per workspace.
          </p>
        </div>
        {clients.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No active clients.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="py-2 font-medium">Client</th>
                  <th className="py-2 font-medium">Tier</th>
                  <th className="py-2 font-medium text-right">Cost 7d</th>
                  <th className="py-2 font-medium text-right">Projected/mo</th>
                  <th className="py-2 font-medium text-right">Budget</th>
                  <th className="py-2 font-medium text-right">Revenue 30d</th>
                  <th className="py-2 font-medium text-right">Margin 30d</th>
                  <th className="py-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const budget = c.ai_budget_cents_monthly;
                  const burnRatio = budget && budget > 0 ? c.projected_monthly_cost_cents / budget : null;
                  const marginPositive = c.margin_30d_cents >= 0;

                  return (
                    <tr key={c.id} className="border-b border-slate-800/60 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <span className="font-medium text-white">{c.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">{c.slug}</span>
                      </td>
                      <td className="py-3">
                        <TierBadge tier={c.tier} />
                      </td>
                      <td className="py-3 text-right text-slate-300">
                        ${(c.cost_7d_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-slate-300">
                        ${(c.projected_monthly_cost_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-slate-300">
                        {budget === null ? (
                          <span className="text-xs text-slate-500">Unlimited</span>
                        ) : (
                          <div>
                            <div>${(budget / 100).toFixed(2)}</div>
                            {burnRatio !== null && (
                              <BurnBar ratio={burnRatio} />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right text-slate-300">
                        ${(c.revenue_30d_cents / 100).toFixed(0)}
                      </td>
                      <td className={`py-3 text-right font-medium ${marginPositive ? "text-emerald-400" : "text-red-400"}`}>
                        ${(c.margin_30d_cents / 100).toFixed(0)}
                      </td>
                      <td className="py-3 text-center">
                        {c.unacknowledged_insights > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            {c.unacknowledged_insights}
                          </span>
                        )}
                        {c.active_overrides > 0 && (
                          <span className="ml-1 inline-flex items-center gap-1 text-xs bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full">
                            <Zap className="w-3 h-3" />
                            {c.active_overrides}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cost by provider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-base font-semibold text-white mb-4">
            Cost by provider (30d)
          </h2>
          {cost_by_provider_30d.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No AI usage recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {cost_by_provider_30d.map((p) => {
                const total = cost_by_provider_30d.reduce((s, x) => s + x.cost_cents, 0);
                const pct = total > 0 ? (p.cost_cents / total) * 100 : 0;
                return (
                  <div key={p.provider}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-300 capitalize">
                        {p.provider}
                      </span>
                      <span className="text-sm text-white font-medium">
                        ${(p.cost_cents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active overrides */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-base font-semibold text-white mb-4">
            Active CFO overrides
          </h2>
          {active_overrides.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No active model overrides</p>
              <p className="text-xs text-slate-600 mt-1">
                CFO demotes or pins specific models when budgets are at risk.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {active_overrides.map((o) => (
                <div key={o.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <KindBadge kind={o.kind} />
                      <span className="text-sm font-medium text-white">
                        {o.client_name ?? "Global"}
                      </span>
                    </div>
                    {o.expires_at && (
                      <span className="text-xs text-slate-500">
                        expires {new Date(o.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Task: <span className="text-slate-300">{o.task_type ?? "all"}</span>{" "}
                    · Model: <code className="text-blue-400">{o.model_key}</code>
                  </p>
                  {o.reason && <p className="text-xs text-slate-500 mt-1">{o.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent insights */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Recent CFO insights</h2>
          <span className="text-xs text-slate-500">{recent_insights.length} entries</span>
        </div>
        {recent_insights.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No CFO insights yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              The CFO agent runs daily at 6am UTC. It analyzes per-client cost vs revenue and
              logs observations + automatic actions here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent_insights.map((i) => (
              <InsightRow key={i.id} insight={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TotalCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  const map: Record<string, { bg: string; text: string }> = {
    emerald: { bg: "bg-emerald-400/10", text: "text-emerald-400" },
    blue: { bg: "bg-blue-400/10", text: "text-blue-400" },
    violet: { bg: "bg-violet-400/10", text: "text-violet-400" },
    amber: { bg: "bg-amber-400/10", text: "text-amber-400" },
    red: { bg: "bg-red-400/10", text: "text-red-400" },
  };
  const c = map[color] ?? map.blue;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${c.bg} ${c.text}`}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, string> = {
    internal: "bg-slate-700/50 text-slate-300",
    trial: "bg-amber-500/15 text-amber-400",
    starter: "bg-blue-500/15 text-blue-400",
    pro: "bg-violet-500/15 text-violet-400",
    agency: "bg-emerald-500/15 text-emerald-400",
    enterprise: "bg-cyan-500/15 text-cyan-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[tier] ?? map.starter}`}>
      {tier}
    </span>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, { label: string; className: string }> = {
    demote: { label: "Demote", className: "bg-amber-500/15 text-amber-400" },
    promote: { label: "Promote", className: "bg-emerald-500/15 text-emerald-400" },
    pin: { label: "Pin", className: "bg-cyan-500/15 text-cyan-400" },
  };
  const k = map[kind] ?? map.demote;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${k.className}`}>
      {k.label}
    </span>
  );
}

function BurnBar({ ratio }: { ratio: number }) {
  const pct = Math.min(ratio * 100, 120);
  const color =
    ratio >= 1 ? "bg-red-400" : ratio >= 0.9 ? "bg-amber-400" : ratio >= 0.7 ? "bg-amber-400/60" : "bg-emerald-400";
  return (
    <div className="mt-1 h-1.5 w-24 ml-auto bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function InsightRow({
  insight: i,
}: {
  insight: {
    id: string;
    client_name: string | null;
    insight_type: string;
    severity: string;
    title: string;
    description: string;
    action_taken: string | null;
    observed_at: string;
  };
}) {
  const severityStyle: Record<string, string> = {
    info: "bg-slate-500/10 border-slate-500/30",
    warning: "bg-amber-500/10 border-amber-500/30",
    critical: "bg-red-500/10 border-red-500/30",
  };
  const typeIcon: Record<string, React.ReactNode> = {
    burn_alert: <TrendingUp className="w-4 h-4 text-amber-400" />,
    margin_negative: <TrendingDown className="w-4 h-4 text-red-400" />,
    budget_exceeded: <AlertCircle className="w-4 h-4 text-red-400" />,
    tier_upgrade: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    tier_downgrade: <TrendingDown className="w-4 h-4 text-amber-400" />,
    model_demoted: <Zap className="w-4 h-4 text-amber-400" />,
    model_promoted: <Zap className="w-4 h-4 text-emerald-400" />,
    healthy: <Activity className="w-4 h-4 text-emerald-400" />,
    trial_expiring: <Clock className="w-4 h-4 text-amber-400" />,
  };

  return (
    <div
      className={`rounded-lg border p-3 ${severityStyle[i.severity] ?? severityStyle.info}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {typeIcon[i.insight_type] ?? <Bot className="w-4 h-4 text-blue-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-white truncate">{i.title}</p>
            <span className="shrink-0 text-xs text-slate-500">
              {new Date(i.observed_at).toLocaleString()}
            </span>
          </div>
          {i.client_name && (
            <p className="text-xs text-slate-400 mb-1">
              <Building2 className="inline w-3 h-3 mr-1" />
              {i.client_name}
            </p>
          )}
          <p className="text-sm text-slate-300">{i.description}</p>
          {i.action_taken && (
            <p className="mt-2 text-xs text-emerald-400">
              ⚡ Auto-action: {i.action_taken}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

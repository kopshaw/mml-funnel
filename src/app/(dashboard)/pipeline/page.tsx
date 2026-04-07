import { Search, Filter, Users, UserPlus, Target, Clock, Inbox } from "lucide-react";
import { getContacts, getStageDistribution } from "@/lib/queries/pipeline-queries";
import { EmptyState } from "@/components/dashboard/empty-state";

const statusStyles: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400",
  "New Lead": "bg-blue-500/10 text-blue-400",
  qualified: "bg-violet-500/10 text-violet-400",
  Qualified: "bg-violet-500/10 text-violet-400",
  "proposal_sent": "bg-amber-500/10 text-amber-400",
  "Proposal Sent": "bg-amber-500/10 text-amber-400",
  negotiation: "bg-cyan-500/10 text-cyan-400",
  Negotiation: "bg-cyan-500/10 text-cyan-400",
  won: "bg-emerald-500/10 text-emerald-400",
  Won: "bg-emerald-500/10 text-emerald-400",
  lost: "bg-red-500/10 text-red-400",
  Lost: "bg-red-500/10 text-red-400",
  closed_won: "bg-emerald-500/10 text-emerald-400",
  closed_lost: "bg-red-500/10 text-red-400",
};

const stageColors: Record<string, string> = {
  new: "bg-blue-500",
  qualified: "bg-violet-500",
  proposal_sent: "bg-amber-500",
  negotiation: "bg-cyan-500",
  won: "bg-emerald-500",
  closed_won: "bg-emerald-500",
  lost: "bg-red-500",
  closed_lost: "bg-red-500",
  unknown: "bg-slate-500",
};

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-emerald-400";
  if (score >= 60) return "bg-amber-400";
  return "bg-red-400";
}

export default async function PipelinePage() {
  const [{ data: contacts, count }, stageDistribution] = await Promise.all([
    getContacts(undefined, { limit: 50 }),
    getStageDistribution(),
  ]);

  const totalContacts = count ?? contacts.length;
  const totalScore = contacts.reduce(
    (sum: number, c: any) => sum + Number(c.lead_score ?? 0),
    0
  );
  const avgScore = contacts.length > 0 ? Math.round(totalScore / contacts.length) : 0;
  const totalStageCount = stageDistribution.reduce((sum, s) => sum + s.count, 0);

  const summaryCards = [
    {
      label: "Total Contacts",
      value: totalContacts.toLocaleString(),
      icon: Users,
    },
    {
      label: "Pipeline Stages",
      value: stageDistribution.length.toString(),
      icon: UserPlus,
    },
    {
      label: "Avg. Lead Score",
      value: avgScore.toString(),
      icon: Target,
    },
    {
      label: "Total in Pipeline",
      value: totalStageCount.toLocaleString(),
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Pipeline</h2>
        <p className="mt-1 text-sm text-slate-400">
          Track contacts, lead scores, and pipeline stages.
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

      {/* Stage Distribution */}
      {stageDistribution.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-base font-semibold text-slate-100">
            Stage Distribution
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Current pipeline breakdown
          </p>

          {/* Stacked bar */}
          <div className="mt-4 flex h-4 overflow-hidden rounded-full">
            {stageDistribution.map((stage) => {
              const pct = totalStageCount > 0
                ? Math.round((stage.count / totalStageCount) * 100)
                : 0;
              return (
                <div
                  key={stage.status}
                  className={stageColors[stage.status] ?? "bg-slate-500"}
                  style={{ width: `${pct}%` }}
                  title={`${stage.status}: ${stage.count}`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4">
            {stageDistribution.map((stage) => (
              <div key={stage.status} className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${stageColors[stage.status] ?? "bg-slate-500"}`}
                />
                <span className="text-xs text-slate-400">
                  {stage.status}{" "}
                  <span className="font-medium text-slate-300">
                    ({stage.count})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Contacts
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {totalContacts} contacts in pipeline
              </p>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  className="h-9 w-64 rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <button
                type="button"
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 transition-colors hover:bg-slate-800"
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
              </button>
            </div>
          </div>
        </div>

        {contacts.length === 0 ? (
          <EmptyState
            title="No contacts yet"
            description="Contacts will appear here once leads start flowing into your funnels."
            icon={Inbox}
            className="border-0 rounded-t-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-center">Lead Score</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {contacts.map((contact: any) => {
                  const name = [contact.first_name, contact.last_name]
                    .filter(Boolean)
                    .join(" ") || "Unknown";
                  const score = Number(contact.lead_score ?? 0);
                  const status = contact.qualification_status ?? "unknown";
                  return (
                    <tr
                      key={contact.id}
                      className="text-sm transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-3 font-medium text-slate-200">
                        {name}
                      </td>
                      <td className="px-5 py-3 text-slate-400">{contact.email}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status] ?? "bg-slate-700 text-slate-300"}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
                            <div
                              className={`h-full rounded-full ${getScoreBg(score)}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-medium ${getScoreColor(score)}`}
                          >
                            {score}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {contact.source ?? "N/A"}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500">
                        {contact.created_at
                          ? new Date(contact.created_at).toLocaleDateString()
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

import { Search, Filter, Users, UserPlus, Target, Clock } from "lucide-react";

const contacts = [
  {
    name: "Sarah Mitchell",
    email: "sarah.mitchell@techcorp.com",
    status: "Qualified",
    leadScore: 92,
    source: "VSL High-Ticket",
    lastActivity: "2 hours ago",
  },
  {
    name: "James Rodriguez",
    email: "j.rodriguez@acmeinc.com",
    status: "Proposal Sent",
    leadScore: 87,
    source: "Webinar Funnel",
    lastActivity: "4 hours ago",
  },
  {
    name: "Emily Chen",
    email: "emily.chen@startupxyz.io",
    status: "New Lead",
    leadScore: 64,
    source: "Free Audit",
    lastActivity: "6 hours ago",
  },
  {
    name: "Michael Thompson",
    email: "mthompson@enterprise.co",
    status: "Negotiation",
    leadScore: 95,
    source: "Discovery Call",
    lastActivity: "1 day ago",
  },
  {
    name: "Lisa Park",
    email: "lisa.park@designstudio.com",
    status: "Qualified",
    leadScore: 78,
    source: "Webinar Funnel",
    lastActivity: "1 day ago",
  },
  {
    name: "David Kim",
    email: "dkim@growthagency.com",
    status: "New Lead",
    leadScore: 45,
    source: "Facebook Ads",
    lastActivity: "2 days ago",
  },
  {
    name: "Rachel Foster",
    email: "rachel@consultpro.net",
    status: "Won",
    leadScore: 98,
    source: "VSL High-Ticket",
    lastActivity: "2 days ago",
  },
  {
    name: "Andrew Blake",
    email: "ablake@mediahouse.com",
    status: "Proposal Sent",
    leadScore: 82,
    source: "Discovery Call",
    lastActivity: "3 days ago",
  },
  {
    name: "Jennifer Wu",
    email: "jen.wu@creativelabs.co",
    status: "Lost",
    leadScore: 31,
    source: "Free Audit",
    lastActivity: "4 days ago",
  },
  {
    name: "Carlos Mendez",
    email: "carlos@ecomflow.com",
    status: "New Lead",
    leadScore: 56,
    source: "Google Ads",
    lastActivity: "5 days ago",
  },
];

const statusStyles: Record<string, string> = {
  "New Lead": "bg-blue-500/10 text-blue-400",
  Qualified: "bg-violet-500/10 text-violet-400",
  "Proposal Sent": "bg-amber-500/10 text-amber-400",
  Negotiation: "bg-cyan-500/10 text-cyan-400",
  Won: "bg-emerald-500/10 text-emerald-400",
  Lost: "bg-red-500/10 text-red-400",
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

const stageDistribution = [
  { stage: "New Lead", count: 48, pct: 32, color: "bg-blue-500" },
  { stage: "Qualified", count: 35, pct: 23, color: "bg-violet-500" },
  { stage: "Proposal Sent", count: 28, pct: 19, color: "bg-amber-500" },
  { stage: "Negotiation", count: 18, pct: 12, color: "bg-cyan-500" },
  { stage: "Won", count: 15, pct: 10, color: "bg-emerald-500" },
  { stage: "Lost", count: 6, pct: 4, color: "bg-red-500" },
];

const summaryCards = [
  {
    label: "Total Contacts",
    value: "150",
    icon: Users,
  },
  {
    label: "New This Week",
    value: "23",
    icon: UserPlus,
  },
  {
    label: "Avg. Lead Score",
    value: "72",
    icon: Target,
  },
  {
    label: "Avg. Response Time",
    value: "4.2 hrs",
    icon: Clock,
  },
];

export default function PipelinePage() {
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
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-base font-semibold text-slate-100">
          Stage Distribution
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Current pipeline breakdown
        </p>

        {/* Stacked bar */}
        <div className="mt-4 flex h-4 overflow-hidden rounded-full">
          {stageDistribution.map((stage) => (
            <div
              key={stage.stage}
              className={`${stage.color}`}
              style={{ width: `${stage.pct}%` }}
              title={`${stage.stage}: ${stage.count}`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4">
          {stageDistribution.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
              <span className="text-xs text-slate-400">
                {stage.stage}{" "}
                <span className="font-medium text-slate-300">
                  ({stage.count})
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Contact List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Contacts
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {contacts.length} contacts in pipeline
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">Lead Score</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3 text-right">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {contacts.map((contact) => (
                <tr
                  key={contact.email}
                  className="text-sm transition-colors hover:bg-slate-800/40"
                >
                  <td className="px-5 py-3 font-medium text-slate-200">
                    {contact.name}
                  </td>
                  <td className="px-5 py-3 text-slate-400">{contact.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[contact.status] ?? "bg-slate-700 text-slate-300"}`}
                    >
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className={`h-full rounded-full ${getScoreBg(contact.leadScore)}`}
                          style={{ width: `${contact.leadScore}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${getScoreColor(contact.leadScore)}`}
                      >
                        {contact.leadScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{contact.source}</td>
                  <td className="px-5 py-3 text-right text-slate-500">
                    {contact.lastActivity}
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

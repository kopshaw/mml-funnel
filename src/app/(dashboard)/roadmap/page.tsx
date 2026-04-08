"use client";

import {
  CheckCircle2,
  Circle,
  Layers,
  Server,
  Brain,
  Megaphone,
  MessageCircle,
  DollarSign,
  Rocket,
} from "lucide-react";

type PhaseStatus = "complete" | "in-progress" | "planned";

interface RoadmapItem {
  label: string;
  done: boolean;
}

interface Phase {
  number: number;
  title: string;
  status: PhaseStatus;
  progress: number;
  icon: React.ElementType;
  items: RoadmapItem[];
}

const phases: Phase[] = [
  {
    number: 1,
    title: "Foundation",
    status: "complete",
    progress: 100,
    icon: Layers,
    items: [
      { label: "Next.js app scaffold + 15 DB tables", done: true },
      { label: "Supabase Auth + multi-tenant architecture", done: true },
      { label: "Landing page at sophiafunnels.com", done: true },
      { label: "Dashboard layout + sidebar nav", done: true },
      { label: "Campaign creation wizard", done: true },
      { label: "User management with role-based access", done: true },
      { label: "Admin settings panel", done: true },
    ],
  },
  {
    number: 2,
    title: "Core Infrastructure",
    status: "in-progress",
    progress: 40,
    icon: Server,
    items: [
      { label: "Fix auth schema bug (GoTrue NULL columns)", done: false },
      { label: "Wire API keys (Twilio, Meta, Stripe, Resend)", done: false },
      { label: "Droplet security hardening", done: false },
      { label: "Real data in overview KPIs", done: false },
      { label: "Funnel stage baselines", done: false },
      { label: "Webhook registration", done: false },
    ],
  },
  {
    number: 3,
    title: "Self-Healing Engine",
    status: "planned",
    progress: 0,
    icon: Brain,
    items: [
      { label: "Metric snapshot collection (30min cron)", done: false },
      { label: "Bottleneck detection algorithms", done: false },
      { label: "Claude API diagnosis integration", done: false },
      { label: "Auto-action execution (low-risk)", done: false },
      { label: "Approval workflow (med/high-risk)", done: false },
      { label: "Impact review system (48hr eval)", done: false },
      { label: "Safety limits (3 actions/day, 4hr cooldown)", done: false },
    ],
  },
  {
    number: 4,
    title: "Traffic & Ads",
    status: "planned",
    progress: 0,
    icon: Megaphone,
    items: [
      { label: "Meta Ads API integration", done: false },
      { label: "Campaign performance dashboards", done: false },
      { label: "Automated budget adjustments", done: false },
      { label: "A/B testing framework", done: false },
      { label: "AI ad copy generation", done: false },
    ],
  },
  {
    number: 5,
    title: "AI Conversations",
    status: "planned",
    progress: 0,
    icon: MessageCircle,
    items: [
      { label: "Twilio SMS integration", done: false },
      { label: "Resend email sequences", done: false },
      { label: "Claude-powered lead qualification", done: false },
      { label: "Conversation thread management", done: false },
      { label: "Escalation workflows", done: false },
      { label: "AI message limits (5 before human review)", done: false },
    ],
  },
  {
    number: 6,
    title: "Revenue & Pipeline",
    status: "planned",
    progress: 0,
    icon: DollarSign,
    items: [
      { label: "Stripe payment integration", done: false },
      { label: "Pipeline stage tracking", done: false },
      { label: "Revenue attribution by funnel", done: false },
      { label: "Customer lifecycle management", done: false },
    ],
  },
  {
    number: 7,
    title: "Scale & Polish",
    status: "planned",
    progress: 0,
    icon: Rocket,
    items: [
      { label: "Multi-client billing", done: false },
      { label: "White-label capabilities", done: false },
      { label: "Advanced analytics charts", done: false },
      { label: "API documentation", done: false },
      { label: "Performance optimization", done: false },
    ],
  },
];

const statusConfig: Record<
  PhaseStatus,
  { label: string; badgeBg: string; badgeText: string; barColor: string }
> = {
  complete: {
    label: "COMPLETE",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-400",
    barColor: "bg-emerald-500",
  },
  "in-progress": {
    label: "IN PROGRESS",
    badgeBg: "bg-blue-500/15",
    badgeText: "text-blue-400",
    barColor: "bg-blue-500",
  },
  planned: {
    label: "PLANNED",
    badgeBg: "bg-slate-700/50",
    badgeText: "text-slate-400",
    barColor: "bg-slate-700",
  },
};

function timelineNodeColor(status: PhaseStatus): string {
  if (status === "complete") return "bg-emerald-500 ring-emerald-500/30";
  if (status === "in-progress") return "bg-blue-500 ring-blue-500/30 animate-pulse";
  return "bg-slate-700 ring-slate-700/30";
}

export default function RoadmapPage() {
  const totalItems = phases.reduce((s, p) => s + p.items.length, 0);
  const doneItems = phases.reduce(
    (s, p) => s + p.items.filter((i) => i.done).length,
    0
  );
  const overallProgress = Math.round((doneItems / totalItems) * 100);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      {/* ---------- Header ---------- */}
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          SOPHIA Development Roadmap
        </h1>
        <p className="mt-3 text-base text-slate-400 sm:text-lg">
          Building the world&rsquo;s first self-healing marketing funnel
          &mdash; from foundation to fully autonomous optimization.
        </p>

        {/* Overall progress summary */}
        <div className="mx-auto mt-6 max-w-md">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-300">Overall progress</span>
            <span className="font-semibold text-slate-100">
              {overallProgress}% &middot; {doneItems}/{totalItems} tasks
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ---------- Timeline ---------- */}
      <div className="relative mx-auto mt-12 max-w-3xl">
        {/* Vertical connector line */}
        <div className="absolute left-5 top-0 hidden h-full w-0.5 bg-slate-800 sm:block" />

        <div className="space-y-8">
          {phases.map((phase, idx) => {
            const cfg = statusConfig[phase.status];
            const Icon = phase.icon;
            const isLast = idx === phases.length - 1;

            return (
              <div key={phase.number} className="relative flex gap-6">
                {/* Timeline node (hidden on small screens) */}
                <div className="relative z-10 hidden flex-col items-center sm:flex">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ${timelineNodeColor(phase.status)}`}
                  >
                    <span className="text-xs font-bold text-white">
                      {phase.number}
                    </span>
                  </div>
                  {/* Connector spacer so the line looks continuous */}
                  {!isLast && <div className="w-0.5 flex-1 bg-slate-800" />}
                </div>

                {/* Card */}
                <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm transition-colors hover:border-slate-700">
                  {/* Card header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 sm:hidden">
                        <span className="text-xs font-bold text-slate-300">
                          {phase.number}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-100">
                          <Icon className="mr-1.5 inline-block h-4 w-4 align-text-top text-slate-400" />
                          Phase {phase.number}: {phase.title}
                        </h2>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${cfg.badgeBg} ${cfg.badgeText}`}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-medium text-slate-300">
                        {phase.progress}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${cfg.barColor} transition-all duration-700`}
                        style={{ width: `${phase.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Checklist */}
                  <ul className="mt-4 space-y-2">
                    {phase.items.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-start gap-2 text-sm"
                      >
                        {item.done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                        )}
                        <span
                          className={
                            item.done ? "text-slate-400 line-through" : "text-slate-300"
                          }
                        >
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- Footer note ---------- */}
      <p className="mx-auto mt-12 max-w-3xl text-center text-xs text-slate-600">
        Roadmap maintained by Metric Mentor Labs. Last updated April 2026.
      </p>
    </div>
  );
}

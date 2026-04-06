const healingActions = [
  {
    id: "h-001",
    timestamp: "2026-04-06 09:42 AM",
    actionType: "Email Resend",
    diagnosis:
      "Detected 3 unopened follow-up emails in VSL funnel stage 4. Triggered re-send with alternate subject line.",
    status: "completed" as const,
    riskTier: "low" as const,
  },
  {
    id: "h-002",
    timestamp: "2026-04-06 09:15 AM",
    actionType: "Page Swap",
    diagnosis:
      "Landing page bounce rate exceeded 65% threshold. Swapped to variant B with shorter headline.",
    status: "completed" as const,
    riskTier: "medium" as const,
  },
  {
    id: "h-003",
    timestamp: "2026-04-06 08:30 AM",
    actionType: "Offer Adjustment",
    diagnosis:
      "Cart abandonment rate spiked to 42%. Considering price anchor adjustment for Retainer Upsell.",
    status: "pending_review" as const,
    riskTier: "high" as const,
  },
  {
    id: "h-004",
    timestamp: "2026-04-05 11:20 PM",
    actionType: "Sequence Delay",
    diagnosis:
      "Engagement score dropped below threshold in Free Audit sequence. Inserted 24hr cooling period before next touch.",
    status: "completed" as const,
    riskTier: "low" as const,
  },
  {
    id: "h-005",
    timestamp: "2026-04-05 06:45 PM",
    actionType: "SMS Fallback",
    diagnosis:
      "Email delivery rate below 80% for segment. Activated SMS fallback for undelivered contacts.",
    status: "in_progress" as const,
    riskTier: "medium" as const,
  },
];

const statusStyles = {
  completed: "bg-healthy/10 text-healthy",
  in_progress: "bg-primary/10 text-primary",
  pending_review: "bg-warning/10 text-warning",
};

const statusLabels = {
  completed: "Completed",
  in_progress: "In Progress",
  pending_review: "Needs Review",
};

const riskStyles = {
  low: "border-healthy/30 text-healthy",
  medium: "border-warning/30 text-warning",
  high: "border-critical/30 text-critical",
};

const riskLabels = {
  low: "Low Risk",
  medium: "Med Risk",
  high: "High Risk",
};

export default function HealingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Self-Healing Activity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Automated diagnostics and corrective actions across your funnels.
        </p>
      </div>

      {/* Activity feed */}
      <div className="space-y-3">
        {healingActions.map((action) => (
          <div
            key={action.id}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {action.actionType}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[action.status]}`}
                  >
                    {statusLabels[action.status]}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${riskStyles[action.riskTier]}`}
                  >
                    {riskLabels[action.riskTier]}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {action.diagnosis}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {action.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

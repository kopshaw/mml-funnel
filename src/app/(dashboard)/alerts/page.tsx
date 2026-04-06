const alerts = [
  {
    id: "a-001",
    severity: "critical" as const,
    title: "Contractor Onboarding funnel health critical",
    message:
      "Conversion rate dropped below 5% for 48+ hours. Manual review recommended before self-healing escalation.",
    timestamp: "2026-04-06 09:50 AM",
    acknowledged: false,
  },
  {
    id: "a-002",
    severity: "warning" as const,
    title: "Free Audit Lead Magnet bounce rate elevated",
    message:
      "Landing page bounce rate at 62%, approaching 65% auto-swap threshold. Monitor or pre-approve variant.",
    timestamp: "2026-04-06 08:12 AM",
    acknowledged: false,
  },
  {
    id: "a-003",
    severity: "warning" as const,
    title: "Email deliverability dip on Webinar sequence",
    message:
      "Delivery rate dropped to 83% for segment A. Warm-up rotation scheduled for next batch.",
    timestamp: "2026-04-05 07:30 PM",
    acknowledged: true,
  },
  {
    id: "a-004",
    severity: "info" as const,
    title: "Self-healing action completed successfully",
    message:
      "VSL funnel stage 4 email resend executed. Open rate recovered to 28% from 14%.",
    timestamp: "2026-04-05 04:15 PM",
    acknowledged: true,
  },
  {
    id: "a-005",
    severity: "info" as const,
    title: "New funnel draft ready for review",
    message:
      "Retainer Upsell Sequence has been staged with 4 steps. Awaiting activation.",
    timestamp: "2026-04-05 02:00 PM",
    acknowledged: true,
  },
];

const severityStyles = {
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  critical: "bg-critical/10 text-critical border-critical/20",
};

const severityDotStyles = {
  info: "bg-primary",
  warning: "bg-warning",
  critical: "bg-critical",
};

const severityLabels = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Alerts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          System notifications and threshold alerts across all funnels.
        </p>
      </div>

      {/* Alert summary */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-critical/20 bg-critical/5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-critical" />
          <span className="text-sm font-medium text-critical">
            {alerts.filter((a) => a.severity === "critical").length} Critical
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" />
          <span className="text-sm font-medium text-warning">
            {alerts.filter((a) => a.severity === "warning").length} Warning
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-sm font-medium text-primary">
            {alerts.filter((a) => a.severity === "info").length} Info
          </span>
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-xl border bg-card p-5 transition-colors ${
              alert.acknowledged
                ? "border-border opacity-60"
                : "border-border"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${severityDotStyles[alert.severity]}`}
                  />
                  <h3 className="text-sm font-semibold text-foreground">
                    {alert.title}
                  </h3>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${severityStyles[alert.severity]}`}
                  >
                    {severityLabels[alert.severity]}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {alert.message}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">
                  {alert.timestamp}
                </span>
                {alert.acknowledged && (
                  <span className="text-xs text-muted-foreground">
                    Acknowledged
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

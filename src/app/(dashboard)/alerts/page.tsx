import { Inbox } from "lucide-react";
import { getAlerts, getAlertCounts } from "@/lib/queries/alerts-queries";
import { EmptyState } from "@/components/dashboard/empty-state";

const severityStyles: Record<string, string> = {
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  critical: "bg-critical/10 text-critical border-critical/20",
};

const severityDotStyles: Record<string, string> = {
  info: "bg-primary",
  warning: "bg-warning",
  critical: "bg-critical",
};

const severityLabels: Record<string, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

export default async function AlertsPage() {
  const [alerts, counts] = await Promise.all([
    getAlerts(),
    getAlertCounts(),
  ]);

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
            {counts.critical} Critical
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" />
          <span className="text-sm font-medium text-warning">
            {counts.warning} Warning
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-sm font-medium text-primary">
            {counts.info} Info
          </span>
        </div>
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <EmptyState
          title="No alerts"
          description="System alerts will appear here when thresholds are breached or anomalies are detected."
          icon={Inbox}
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: any) => {
            const severity = alert.severity ?? "info";
            const isResolved = alert.is_resolved ?? false;
            return (
              <div
                key={alert.id}
                className={`rounded-xl border bg-card p-5 transition-colors ${
                  isResolved
                    ? "border-border opacity-60"
                    : "border-border"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${severityDotStyles[severity] ?? "bg-slate-500"}`}
                      />
                      <h3 className="text-sm font-semibold text-foreground">
                        {alert.title}
                      </h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${severityStyles[severity] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}
                      >
                        {severityLabels[severity] ?? severity}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {alert.message}
                    </p>
                    {alert.funnel_name && (
                      <p className="text-xs text-muted-foreground">
                        Funnel: {alert.funnel_name}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      {alert.created_at
                        ? new Date(alert.created_at).toLocaleDateString()
                        : ""}
                    </span>
                    {isResolved && (
                      <span className="text-xs text-muted-foreground">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

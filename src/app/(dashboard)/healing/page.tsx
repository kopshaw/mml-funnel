import { Inbox } from "lucide-react";
import { getOptimizationActions } from "@/lib/queries/healing-queries";
import { EmptyState } from "@/components/dashboard/empty-state";

const statusStyles: Record<string, string> = {
  completed: "bg-healthy/10 text-healthy",
  deployed: "bg-healthy/10 text-healthy",
  monitoring: "bg-primary/10 text-primary",
  in_progress: "bg-primary/10 text-primary",
  suggested: "bg-warning/10 text-warning",
  approved: "bg-warning/10 text-warning",
  rejected: "bg-critical/10 text-critical",
  rolled_back: "bg-critical/10 text-critical",
};

const statusLabels: Record<string, string> = {
  completed: "Completed",
  deployed: "Deployed",
  monitoring: "Monitoring",
  in_progress: "In Progress",
  suggested: "Suggested",
  approved: "Approved",
  rejected: "Rejected",
  rolled_back: "Rolled Back",
};

const priorityStyles: Record<string, string> = {
  low: "border-healthy/30 text-healthy",
  medium: "border-warning/30 text-warning",
  high: "border-critical/30 text-critical",
  critical: "border-critical/30 text-critical",
};

const priorityLabels: Record<string, string> = {
  low: "Low Risk",
  medium: "Med Risk",
  high: "High Risk",
  critical: "Critical",
};

export default async function HealingPage() {
  const actions = await getOptimizationActions();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          SOPHIA Optimization
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          SOPHIA continuously monitors and optimizes your funnel performance.
        </p>
      </div>

      {/* Activity feed */}
      {actions.length === 0 ? (
        <EmptyState
          title="No optimization actions yet"
          description="SOPHIA will display optimization actions here as it monitors your funnel performance."
          icon={Inbox}
        />
      ) : (
        <div className="space-y-3">
          {actions.map((action: any) => {
            const status = action.status ?? "suggested";
            const priority = action.risk_tier ?? "low";
            const actionTypeLabel = (action.action_type ?? "")
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase());

            return (
              <div
                key={action.id}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {actionTypeLabel}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {statusLabels[status] ?? status}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityStyles[priority] ?? "border-slate-500 text-slate-400"}`}
                      >
                        {priorityLabels[priority] ?? priority}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {action.diagnosis || ""}
                    </p>
                    {action.funnel_name && (
                      <p className="text-xs text-muted-foreground">
                        Funnel: {action.funnel_name}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {action.created_at
                      ? new Date(action.created_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

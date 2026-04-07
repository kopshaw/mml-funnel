import { Inbox } from "lucide-react";
import { getFunnels } from "@/lib/queries/funnel-queries";
import { EmptyState } from "@/components/dashboard/empty-state";

const healthColors: Record<string, string> = {
  healthy: "bg-healthy",
  warning: "bg-warning",
  critical: "bg-critical",
};

const healthLabels: Record<string, string> = {
  healthy: "Healthy",
  warning: "Needs Attention",
  critical: "Critical",
};

const statusStyles: Record<string, string> = {
  active: "bg-healthy/10 text-healthy",
  Active: "bg-healthy/10 text-healthy",
  paused: "bg-warning/10 text-warning",
  Paused: "bg-warning/10 text-warning",
  draft: "bg-muted text-muted-foreground",
  Draft: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

export default async function FunnelsPage() {
  const funnels = await getFunnels();

  const activeFunnels = funnels.filter(
    (f: any) => f.status === "active"
  ).length;
  const healthyFunnels = funnels.filter(
    (f: any) => f.health === "healthy"
  ).length;
  const needsAttention = funnels.filter(
    (f: any) => f.health === "warning" || f.health === "critical"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Funnel Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor funnel health and performance across all active campaigns.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Active Funnels
          </p>
          <p className="mt-1 text-3xl font-bold text-foreground">
            {activeFunnels}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Healthy</p>
          <p className="mt-1 text-3xl font-bold text-healthy">
            {healthyFunnels}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Needs Attention
          </p>
          <p className="mt-1 text-3xl font-bold text-warning">
            {needsAttention}
          </p>
        </div>
      </div>

      {/* Funnel grid */}
      {funnels.length === 0 ? (
        <EmptyState
          title="No funnels yet"
          description="Create your first funnel to start tracking performance and health."
          icon={Inbox}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funnels.map((funnel: any) => {
            const health = funnel.status === "active" ? "healthy" : funnel.status === "paused" ? "warning" : "healthy";
            const status = funnel.status ?? "draft";
            const statusKey =
              status.charAt(0).toUpperCase() + status.slice(1);
            return (
              <div
                key={funnel.id}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${healthColors[health] ?? "bg-slate-500"}`}
                    />
                    <h3 className="font-semibold text-foreground">
                      {funnel.name}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status] ?? statusStyles[statusKey] ?? "bg-muted text-muted-foreground"}`}
                  >
                    {statusKey}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Offer Type</span>
                    <span className="text-foreground">
                      {funnel.offer_type}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stages</span>
                    <span className="text-foreground">{funnel.stages}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Health</span>
                    <span className="text-foreground">
                      {healthLabels[health] ?? "Unknown"}
                    </span>
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

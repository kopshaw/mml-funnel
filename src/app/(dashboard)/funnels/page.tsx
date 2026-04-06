const funnels = [
  {
    name: "VSL High-Ticket Closer",
    offer: "Done-For-You",
    status: "Active",
    stages: 6,
    health: "healthy" as const,
  },
  {
    name: "Webinar Ops Accelerator",
    offer: "Group Coaching",
    status: "Active",
    stages: 5,
    health: "healthy" as const,
  },
  {
    name: "Free Audit Lead Magnet",
    offer: "Lead Magnet",
    status: "Active",
    stages: 4,
    health: "warning" as const,
  },
  {
    name: "Contractor Onboarding",
    offer: "Internal",
    status: "Paused",
    stages: 3,
    health: "critical" as const,
  },
  {
    name: "Retainer Upsell Sequence",
    offer: "Upsell",
    status: "Draft",
    stages: 4,
    health: "healthy" as const,
  },
  {
    name: "Discovery Call Booking",
    offer: "Service",
    status: "Active",
    stages: 3,
    health: "warning" as const,
  },
];

const healthColors = {
  healthy: "bg-healthy",
  warning: "bg-warning",
  critical: "bg-critical",
};

const healthLabels = {
  healthy: "Healthy",
  warning: "Needs Attention",
  critical: "Critical",
};

const statusStyles: Record<string, string> = {
  Active:
    "bg-healthy/10 text-healthy",
  Paused:
    "bg-warning/10 text-warning",
  Draft:
    "bg-muted text-muted-foreground",
};

export default function FunnelsPage() {
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
            {funnels.filter((f) => f.status === "Active").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Healthy
          </p>
          <p className="mt-1 text-3xl font-bold text-healthy">
            {funnels.filter((f) => f.health === "healthy").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Needs Attention
          </p>
          <p className="mt-1 text-3xl font-bold text-warning">
            {
              funnels.filter(
                (f) => f.health === "warning" || f.health === "critical"
              ).length
            }
          </p>
        </div>
      </div>

      {/* Funnel grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {funnels.map((funnel) => (
          <div
            key={funnel.name}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${healthColors[funnel.health]}`}
                />
                <h3 className="font-semibold text-foreground">{funnel.name}</h3>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[funnel.status] ?? "bg-muted text-muted-foreground"}`}
              >
                {funnel.status}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Offer Type</span>
                <span className="text-foreground">{funnel.offer}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stages</span>
                <span className="text-foreground">{funnel.stages}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Health</span>
                <span className="text-foreground">
                  {healthLabels[funnel.health]}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

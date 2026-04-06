import { cn } from "@/lib/utils";

type ActivityType = "action" | "alert" | "conversion" | "conversation";
type Severity = "info" | "warning" | "critical";

interface ActivityItemProps {
  title: string;
  description: string;
  timestamp: string;
  type: ActivityType;
  severity?: Severity;
  className?: string;
}

const typeBarColors: Record<ActivityType, string> = {
  action: "bg-blue-500",
  alert: "bg-amber-500",
  conversion: "bg-emerald-500",
  conversation: "bg-violet-500",
};

const severityDotColors: Record<Severity, string> = {
  info: "bg-slate-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
};

export function ActivityItem({
  title,
  description,
  timestamp,
  type,
  severity,
  className,
}: ActivityItemProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 transition-colors hover:border-slate-700",
        className
      )}
    >
      {/* Left color indicator bar */}
      <div
        className={cn(
          "mt-0.5 h-full min-h-[40px] w-1 shrink-0 rounded-full",
          typeBarColors[type]
        )}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-white">{title}</p>
          {severity && (
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                severityDotColors[severity]
              )}
              aria-label={`Severity: ${severity}`}
            />
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-400 line-clamp-2">
          {description}
        </p>
      </div>

      {/* Timestamp */}
      <span className="shrink-0 text-xs text-slate-500">{timestamp}</span>
    </div>
  );
}

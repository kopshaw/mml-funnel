import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: ReactNode;
  className?: string;
}

const changeColors: Record<KpiCardProps["changeType"], string> = {
  positive: "text-emerald-400",
  negative: "text-red-400",
  neutral: "text-slate-400",
};

const changeLabels: Record<KpiCardProps["changeType"], string> = {
  positive: "increase",
  negative: "decrease",
  neutral: "no change",
};

export function KpiCard({
  title,
  value,
  change,
  changeType,
  icon,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900 p-6",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
          <p
            className={cn("text-sm font-medium", changeColors[changeType])}
            aria-label={`${change} ${changeLabels[changeType]}`}
          >
            {change}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

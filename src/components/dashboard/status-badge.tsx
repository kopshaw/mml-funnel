import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  status: string;
  variant: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-400 ring-amber-500/20",
  danger: "bg-red-500/15 text-red-400 ring-red-500/20",
  info: "bg-blue-500/15 text-blue-400 ring-blue-500/20",
  neutral: "bg-slate-500/15 text-slate-400 ring-slate-500/20",
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variantStyles[variant],
        className
      )}
    >
      {status}
    </span>
  );
}

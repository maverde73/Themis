import { cn } from "@/lib/utils";
import type { ReportStatusEnum } from "@/lib/api";

const statusConfig: Record<
  ReportStatusEnum,
  { label: string; dot: string; badge: string }
> = {
  RECEIVED: {
    label: "Ricevuta",
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  ACKNOWLEDGED: {
    label: "Presa in carico",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  INVESTIGATING: {
    label: "Istruttoria",
    dot: "bg-purple-500",
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  },
  RESPONSE_GIVEN: {
    label: "Riscontro dato",
    dot: "bg-cyan-500",
    badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  },
  CLOSED_FOUNDED: {
    label: "Fondata",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  CLOSED_UNFOUNDED: {
    label: "Infondata",
    dot: "bg-slate-400",
    badge: "bg-slate-400/10 text-slate-600 dark:text-slate-400",
  },
  CLOSED_BAD_FAITH: {
    label: "Mala fede",
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
};

interface StatusBadgeProps {
  status: ReportStatusEnum;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    dot: "bg-gray-400",
    badge: "bg-gray-400/10 text-gray-600",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.badge,
        className
      )}
    >
      <span
        className={cn("inline-block h-1.5 w-1.5 rounded-full", config.dot)}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

export function getStatusLabel(status: ReportStatusEnum): string {
  return statusConfig[status]?.label ?? status;
}

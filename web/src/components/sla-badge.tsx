import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SlaBadgeProps {
  deadline: string | null;
  met: boolean | null;
  isClosed: boolean;
  className?: string;
}

export function SlaBadge({ deadline, met, isClosed, className }: SlaBadgeProps) {
  if (!deadline) {
    return <span className={cn("text-xs text-muted-foreground", className)}>-</span>;
  }

  if (isClosed && met === true) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400",
          className
        )}
      >
        <Check className="h-3 w-3" />
        Rispettato
      </span>
    );
  }

  if (isClosed && met === false) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400",
          className
        )}
      >
        Sforato
      </span>
    );
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysRemaining = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (daysRemaining < 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400",
          className
        )}
      >
        Scaduto
      </span>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400",
          className
        )}
      >
        {daysRemaining}gg
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400",
        className
      )}
    >
      In tempo
    </span>
  );
}

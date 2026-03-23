import { cn } from "@/lib/utils";

interface SlaProgressCardProps {
  title: string;
  deadline: string | null;
  met: boolean | null;
  startDate: string;
  className?: string;
}

export function SlaProgressCard({
  title,
  deadline,
  met,
  startDate,
  className,
}: SlaProgressCardProps) {
  if (!deadline) {
    return (
      <div className={cn("rounded-lg border p-4", className)}>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">Non applicabile</p>
      </div>
    );
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const startDateObj = new Date(startDate);
  const totalDays = Math.max(1, Math.ceil((deadlineDate.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000)));
  const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  const elapsed = totalDays - daysRemaining;
  const progress = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));

  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining >= 0 && daysRemaining <= 7;
  const isOk = daysRemaining > 7;
  const isMet = met === true;
  const isFailed = met === false;

  let borderColor = "border-l-emerald-500";
  let progressColor = "bg-emerald-500";
  let statusText = `${daysRemaining} giorni rimanenti`;

  if (isMet) {
    borderColor = "border-l-emerald-500";
    progressColor = "bg-emerald-500";
    statusText = "Rispettato";
  } else if (isFailed || isOverdue) {
    borderColor = "border-l-red-500";
    progressColor = "bg-red-500";
    statusText = isFailed ? "Non rispettato" : `Scaduto da ${Math.abs(daysRemaining)} giorni`;
  } else if (isUrgent) {
    borderColor = "border-l-amber-500";
    progressColor = "bg-amber-500";
  }

  const formattedDeadline = deadlineDate.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className={cn("rounded-lg border border-l-4 p-4", borderColor, className)}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{statusText}</p>
      <p className="text-xs text-muted-foreground">Scadenza: {formattedDeadline}</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", progressColor)}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
}

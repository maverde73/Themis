import { cn } from "@/lib/utils";
import type { ReportStatusEnum } from "@/lib/api";
import { Inbox, CheckCircle2, Search, MessageSquare, Lock } from "lucide-react";

interface Step {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  statuses: ReportStatusEnum[];
}

const STEPS: Step[] = [
  { key: "received", label: "Ricevuta", icon: Inbox, statuses: ["RECEIVED"] },
  { key: "acknowledged", label: "Presa in carico", icon: CheckCircle2, statuses: ["ACKNOWLEDGED"] },
  { key: "investigating", label: "Istruttoria", icon: Search, statuses: ["INVESTIGATING"] },
  { key: "response", label: "Riscontro", icon: MessageSquare, statuses: ["RESPONSE_GIVEN"] },
  { key: "closed", label: "Chiusura", icon: Lock, statuses: ["CLOSED_FOUNDED", "CLOSED_UNFOUNDED", "CLOSED_BAD_FAITH"] },
];

const STATUS_ORDER: ReportStatusEnum[] = [
  "RECEIVED",
  "ACKNOWLEDGED",
  "INVESTIGATING",
  "RESPONSE_GIVEN",
  "CLOSED_FOUNDED",
  "CLOSED_UNFOUNDED",
  "CLOSED_BAD_FAITH",
];

function getStepIndex(status: ReportStatusEnum): number {
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i].statuses.includes(status)) return i;
  }
  return 0;
}

interface CaseTimelineProps {
  currentStatus: ReportStatusEnum;
  className?: string;
}

export function CaseTimeline({ currentStatus, className }: CaseTimelineProps) {
  const currentIdx = getStepIndex(currentStatus);

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                    isCurrent && "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isFuture && "border-dashed border-muted-foreground/30 text-muted-foreground/40"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium text-center whitespace-nowrap",
                    isCompleted && "text-emerald-600 dark:text-emerald-400",
                    isCurrent && "text-foreground",
                    isFuture && "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1",
                    idx < currentIdx ? "bg-emerald-500" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="flex flex-col gap-0 sm:hidden">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;

          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2",
                    isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                    isCurrent && "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isFuture && "border-dashed border-muted-foreground/30 text-muted-foreground/40"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 h-6",
                      idx < currentIdx ? "bg-emerald-500" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-sm font-medium",
                  isCompleted && "text-emerald-600 dark:text-emerald-400",
                  isCurrent && "text-foreground",
                  isFuture && "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

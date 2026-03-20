"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ChatPanelProps {
  reportId: string;
}

export function ChatPanel({ reportId }: ChatPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Secure Chat — Report {reportId.slice(0, 8)}...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <span className="text-3xl" aria-hidden="true">
            &#128274;
          </span>
          <p className="text-sm text-muted-foreground max-w-xs">
            Chat messages are end-to-end encrypted.
            Use the <strong>Manager App</strong> to communicate with the reporter.
          </p>
          <p className="text-xs text-muted-foreground">
            Art. 5 D.Lgs. 24/2023 — acknowledgment within 7 days, response within 3 months.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

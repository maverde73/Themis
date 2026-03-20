"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAnalytics, type AnalyticsData } from "@/lib/api";

interface StoredUser {
  id: string;
  email: string;
  role: string;
  orgId: string;
}

function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const user = getStoredUser();
    if (!user?.orgId) {
      setError("No organization found. Please log in again.");
      setLoading(false);
      return;
    }

    getAnalytics(user.orgId)
      .then(setData)
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Failed to load analytics",
        );
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!data) return null;

  const statusEntries = Object.entries(data.byStatus);

  return (
    <main className="mx-auto max-w-4xl p-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Overview of report metrics and SLA compliance.
        </p>
      </div>

      {/* Total reports */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total reports</CardDescription>
            <CardTitle className="text-3xl">{data.totalReports}</CardTitle>
          </CardHeader>
        </Card>

        {/* By channel */}
        <Card>
          <CardHeader>
            <CardDescription>PdR 125 reports</CardDescription>
            <CardTitle className="text-3xl">{data.byChannel.PDR125}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">PDR125</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Whistleblowing reports</CardDescription>
            <CardTitle className="text-3xl">{data.byChannel.WB}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">WB</Badge>
          </CardContent>
        </Card>
      </div>

      {/* SLA compliance */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>SLA compliance rate</CardDescription>
            <CardTitle className="text-3xl">
              {(data.slaCompliance.rate * 100).toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>On time</CardDescription>
            <CardTitle className="text-3xl">
              {data.slaCompliance.onTime}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-3xl">
              {data.slaCompliance.overdue}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.slaCompliance.overdue > 0 && (
              <Badge variant="destructive">Attention</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reports by status */}
      <Card>
        <CardHeader>
          <CardTitle>Reports by status</CardTitle>
          <CardDescription>
            Breakdown of all reports by their current status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No status data available.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {statusEntries.map(([status, count]) => (
                <li
                  key={status}
                  className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
                >
                  <span className="text-sm font-medium capitalize">
                    {status.replace(/_/g, " ").toLowerCase()}
                  </span>
                  <Badge variant="outline">{count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAnalytics, type AnalyticsData } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { SkeletonPage } from "@/components/skeleton-page";

interface AnalyticsViewProps {
  orgId: string;
}

export function AnalyticsView({ orgId }: AnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalytics(orgId)
      .then(setData)
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Errore nel caricamento analytics",
        );
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  if (loading) {
    return <SkeletonPage rows={3} />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const statusEntries = Object.entries(data.byStatus);

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Panoramica delle segnalazioni e conformità SLA."
        className="mb-6"
      />

      <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Segnalazioni totali</CardDescription>
            <CardTitle className="text-3xl">{data.totalReports}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>PdR 125</CardDescription>
            <CardTitle className="text-3xl">{data.byChannel.PDR125}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">PDR125</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Whistleblowing</CardDescription>
            <CardTitle className="text-3xl">{data.byChannel.WB}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">WB</Badge>
          </CardContent>
        </Card>
      </div>

      {data.slaCompliance && (
        <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Conformità SLA</CardDescription>
              <CardTitle className="text-3xl">
                {(data.slaCompliance.rate * 100).toFixed(1)}%
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Nei tempi</CardDescription>
              <CardTitle className="text-3xl">
                {data.slaCompliance.onTime}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>In ritardo</CardDescription>
              <CardTitle className="text-3xl">
                {data.slaCompliance.overdue}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.slaCompliance.overdue > 0 && (
                <Badge variant="destructive">Attenzione</Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Segnalazioni per stato</CardTitle>
          <CardDescription>
            Distribuzione delle segnalazioni per stato corrente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun dato disponibile.
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
    </div>
  );
}

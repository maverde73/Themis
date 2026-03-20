"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSurveys,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  type Survey,
  type SurveyStatus,
} from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";

// ── Status badge config ─────────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_BADGE: Record<SurveyStatus, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  ACTIVE: { label: "Active", variant: "default" },
  CLOSED: { label: "Closed", variant: "outline" },
  ARCHIVED: { label: "Archived", variant: "destructive" },
};

function statusBadge(status: SurveyStatus) {
  const cfg = STATUS_BADGE[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Default schema template ─────────────────────────────────────────────

const DEFAULT_SCHEMA = JSON.stringify(
  {
    type: "object",
    properties: {
      question1: {
        type: "string",
        title: "Question 1",
      },
    },
    required: ["question1"],
  },
  null,
  2,
);

// ── Page component ──────────────────────────────────────────────────────

export default function SurveysPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSchema, setFormSchema] = useState(DEFAULT_SCHEMA);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchSurveys = useCallback(async () => {
    const user = getStoredUser();
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getSurveys(user.orgId);
      setSurveys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch surveys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchSurveys();
  }, [router, fetchSurveys]);

  // ── Create survey handler ───────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const user = getStoredUser();
    if (!user) return;

    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      setFormError("Title is required");
      return;
    }

    let parsedSchema: Record<string, unknown>;
    try {
      parsedSchema = JSON.parse(formSchema);
    } catch {
      setFormError("Schema must be valid JSON");
      return;
    }

    setFormSubmitting(true);
    try {
      await createSurvey({
        orgId: user.orgId,
        title: trimmedTitle,
        description: formDescription.trim() || undefined,
        schema: parsedSchema,
      });

      // Reset form and refresh list
      setFormTitle("");
      setFormDescription("");
      setFormSchema(DEFAULT_SCHEMA);
      setShowCreateForm(false);
      await fetchSurveys();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create survey");
    } finally {
      setFormSubmitting(false);
    }
  }

  // ── Status change handlers ──────────────────────────────────────────

  async function handleStatusChange(id: string, status: SurveyStatus) {
    setActionLoading(id);
    try {
      await updateSurvey(id, { status });
      await fetchSurveys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update survey");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(id);
    try {
      await deleteSurvey(id);
      await fetchSurveys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive survey");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Render: loading state ───────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Loading surveys...</p>
      </main>
    );
  }

  // ── Render: error state ─────────────────────────────────────────────

  if (error && surveys.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  // ── Render: main page ───────────────────────────────────────────────

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Surveys</h2>
          <p className="text-sm text-muted-foreground">
            {surveys.length} survey{surveys.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm((prev) => !prev)}
          variant={showCreateForm ? "outline" : "default"}
        >
          {showCreateForm ? "Cancel" : "Create Survey"}
        </Button>
      </div>

      {/* Inline error banner */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Survey</CardTitle>
            <CardDescription>
              Define the survey title, description, and schema (JSON).
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="survey-title">Title *</Label>
                <Input
                  id="survey-title"
                  placeholder="e.g. Annual Climate Survey 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="survey-description">Description</Label>
                <textarea
                  id="survey-description"
                  className="min-h-[60px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  placeholder="Optional description of the survey"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="survey-schema">Schema (JSON)</Label>
                <textarea
                  id="survey-schema"
                  className="min-h-[200px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  value={formSchema}
                  onChange={(e) => setFormSchema(e.target.value)}
                  rows={10}
                  spellCheck={false}
                />
              </div>

              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting ? "Creating..." : "Create Survey"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Survey list */}
      {surveys.length === 0 && !showCreateForm ? (
        <Card className="w-full text-center">
          <CardHeader>
            <CardTitle>No surveys yet</CardTitle>
            <CardDescription>
              Create your first survey to start collecting feedback.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => {
            const isActionLoading = actionLoading === survey.id;
            return (
              <Card key={survey.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="leading-snug">{survey.title}</CardTitle>
                    {statusBadge(survey.status)}
                  </div>
                  {survey.description && (
                    <CardDescription className="line-clamp-2">
                      {survey.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>v{survey.version}</span>
                    <span>
                      {survey.responseCount} response
                      {survey.responseCount !== 1 ? "s" : ""}
                    </span>
                    <span>Created {formatDate(survey.createdAt)}</span>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 flex-wrap">
                  {survey.status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(survey.id, "ACTIVE")}
                      disabled={isActionLoading}
                    >
                      Activate
                    </Button>
                  )}
                  {survey.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(survey.id, "CLOSED")}
                      disabled={isActionLoading}
                    >
                      Close
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      router.push(`/rpg/surveys/results?surveyId=${survey.id}`)
                    }
                  >
                    View Results
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(survey.id)}
                    disabled={isActionLoading}
                  >
                    Archive
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}

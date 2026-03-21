"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Trash2, Pencil, Palette } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  getThemes,
  cloneTheme,
  deleteTheme,
  type SurveyTheme,
} from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SkeletonPage } from "@/components/skeleton-page";

export default function ThemesPage() {
  const router = useRouter();
  const [themes, setThemes] = useState<SurveyTheme[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadThemes() {
    const user = getStoredUser();
    if (!user) return;
    try {
      const res = await getThemes(user.orgId);
      setThemes(res.themes);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadThemes();
  }, [router]);

  async function handleClone(theme: SurveyTheme) {
    try {
      await cloneTheme(theme.id);
      loadThemes();
    } catch {
      // ignore
    }
  }

  async function handleDelete(theme: SurveyTheme) {
    if (!confirm(`Eliminare il tema "${theme.name}"?`)) return;
    try {
      await deleteTheme(theme.id);
      loadThemes();
    } catch {
      // ignore
    }
  }

  if (loading) return <SkeletonPage />;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Temi"
        subtitle="Gestisci i temi per i moduli"
        actions={
          <Button size="sm" onClick={() => router.push("/rpg/surveys/themes/edit")}>
            <Plus className="mr-1 h-4 w-4" />
            Crea tema
          </Button>
        }
      />

      {themes.length === 0 ? (
        <EmptyState
          icon={<Palette className="h-6 w-6" />}
          title="Nessun tema"
          description="Crea il tuo primo tema per personalizzare l'aspetto dei moduli."
          action={
            <Button onClick={() => router.push("/rpg/surveys/themes/edit")}>
              <Plus className="mr-1 h-4 w-4" />
              Crea tema
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => {
            const c = theme.config.colors;
            return (
              <Card key={theme.id} className="overflow-hidden">
                {/* Color swatches bar */}
                <div className="flex h-3">
                  <div className="flex-1" style={{ backgroundColor: c.primary }} />
                  <div className="flex-1" style={{ backgroundColor: c.surface }} />
                  <div className="flex-1" style={{ backgroundColor: c.pageBackground }} />
                  <div className="flex-1" style={{ backgroundColor: c.text }} />
                </div>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{theme.name}</h3>
                      {theme.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {theme.description}
                        </p>
                      )}
                      <div className="mt-2 flex gap-1">
                        {theme.isBuiltin && (
                          <Badge variant="secondary" className="text-[10px]">
                            Predefinito
                          </Badge>
                        )}
                        {theme.isPublic && !theme.isBuiltin && (
                          <Badge variant="outline" className="text-[10px]">
                            Pubblico
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!theme.isBuiltin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() =>
                            router.push(`/rpg/surveys/themes/edit?themeId=${theme.id}`)
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleClone(theme)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {!theme.isBuiltin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(theme)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

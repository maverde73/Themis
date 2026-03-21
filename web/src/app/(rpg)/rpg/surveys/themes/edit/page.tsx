"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getThemeById,
  getDefaultThemeConfig,
  createTheme,
  updateTheme,
  type ThemeConfig,
  type ThemeColors,
  type ThemeTypography,
  type ThemeSpacing,
  type ThemeButtons,
  type ThemeCard,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { SkeletonPage } from "@/components/skeleton-page";

// ── Types ────────────────────────────────────────────────────────────

type Section = "colors" | "typography" | "spacing" | "buttons" | "card";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "colors", label: "Colori" },
  { key: "typography", label: "Tipografia" },
  { key: "spacing", label: "Spaziatura" },
  { key: "buttons", label: "Bottoni" },
  { key: "card", label: "Card" },
];

const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  pageBackground: "Sfondo pagina",
  surface: "Superficie",
  primary: "Primario",
  primaryHover: "Primario hover",
  text: "Testo",
  textSecondary: "Testo secondario",
  border: "Bordo",
  error: "Errore",
  success: "Successo",
  warning: "Avviso",
  inputBackground: "Sfondo input",
  inputBorder: "Bordo input",
  inputFocus: "Focus input",
  selectionHighlight: "Selezione",
  required: "Obbligatorio",
};

const FONT_FAMILIES = [
  "Inter, -apple-system, sans-serif",
  "system-ui, sans-serif",
  "Georgia, serif",
  "'Segoe UI', sans-serif",
  "Roboto, sans-serif",
  "'Helvetica Neue', sans-serif",
  "monospace",
];

// ── Page wrapper ─────────────────────────────────────────────────────

export default function ThemeEditPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <ThemeEditContent />
    </Suspense>
  );
}

// ── Main editor ─────────────────────────────────────────────────────

function ThemeEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const themeId = searchParams.get("themeId");
  const isNew = !themeId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState<ThemeConfig | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("colors");

  const loadTheme = useCallback(async () => {
    try {
      if (themeId) {
        const theme = await getThemeById(themeId);
        setName(theme.name);
        setDescription(theme.description ?? "");
        setConfig(theme.config);
      } else {
        const defaults = await getDefaultThemeConfig();
        setConfig(defaults);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadTheme();
  }, [router, loadTheme]);

  async function handleSave() {
    if (!name.trim() || !config) return;
    setSaving(true);
    try {
      if (isNew) {
        await createTheme({
          name: name.trim(),
          description: description.trim() || null,
          config,
        });
      } else {
        await updateTheme(themeId!, {
          name: name.trim(),
          description: description.trim() || null,
          config,
        });
      }
      router.push("/rpg/surveys/themes");
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  function updateColors(key: keyof ThemeColors, value: string) {
    if (!config) return;
    setConfig({ ...config, colors: { ...config.colors, [key]: value } });
  }

  function updateTypography(key: keyof ThemeTypography, value: string) {
    if (!config) return;
    setConfig({ ...config, typography: { ...config.typography, [key]: value } });
  }

  function updateSpacing(key: keyof ThemeSpacing, value: string) {
    if (!config) return;
    setConfig({ ...config, spacing: { ...config.spacing, [key]: value } });
  }

  function updateButtons(key: keyof ThemeButtons, value: string) {
    if (!config) return;
    setConfig({ ...config, buttons: { ...config.buttons, [key]: value } });
  }

  function updateCard(key: keyof ThemeCard, value: string) {
    if (!config) return;
    setConfig({ ...config, card: { ...config.card, [key]: value } });
  }

  if (loading || !config) return <SkeletonPage />;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Top bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex items-center gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button variant="ghost" size="icon" onClick={() => router.push("/rpg/surveys/themes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome tema"
            className="max-w-xs font-semibold"
          />
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Salvataggio..." : "Salva"}
        </Button>
      </div>

      {/* Description */}
      <div className="mb-6">
        <Label>Descrizione (opzionale)</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrizione del tema"
          className="mt-1"
        />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Section tabs */}
        <div className="flex gap-1 overflow-x-auto lg:w-48 lg:flex-col lg:gap-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSection(s.key)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeSection === s.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="flex-1">
          {activeSection === "colors" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Colori</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(COLOR_LABELS) as (keyof ThemeColors)[]).map((key) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <Label className="text-xs">{COLOR_LABELS[key]}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.colors[key].startsWith("rgba") ? "#000000" : config.colors[key]}
                        onChange={(e) => updateColors(key, e.target.value)}
                        className="h-8 w-8 cursor-pointer rounded border"
                      />
                      <Input
                        value={config.colors[key]}
                        onChange={(e) => updateColors(key, e.target.value)}
                        className="flex-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeSection === "typography" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tipografia</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Font famiglia</Label>
                    <select
                      value={config.typography.fontFamily}
                      onChange={(e) => updateTypography("fontFamily", e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f}>
                          {f.split(",")[0].replace(/'/g, "")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Font heading</Label>
                    <select
                      value={config.typography.fontFamilyHeading ?? config.typography.fontFamily}
                      onChange={(e) => updateTypography("fontFamilyHeading", e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f}>
                          {f.split(",")[0].replace(/'/g, "")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {([
                    ["titleSize", "Dim. titolo"],
                    ["titleWeight", "Peso titolo"],
                    ["subtitleSize", "Dim. sottotitolo"],
                    ["labelSize", "Dim. etichetta"],
                    ["labelWeight", "Peso etichetta"],
                    ["bodySize", "Dim. corpo"],
                    ["lineHeight", "Interlinea"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={String(config.typography[key] ?? "")}
                        onChange={(e) => updateTypography(key, e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "spacing" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spaziatura</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ["formMaxWidth", "Larghezza max"],
                  ["formPadding", "Padding form"],
                  ["formPaddingMobile", "Padding mobile"],
                  ["sectionGap", "Gap sezioni"],
                  ["fieldGap", "Gap campi"],
                  ["borderRadius", "Border radius"],
                  ["inputPadding", "Padding input"],
                  ["inputBorderRadius", "Radius input"],
                  ["inputBorderWidth", "Bordo input"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      value={config.spacing[key]}
                      onChange={(e) => updateSpacing(key, e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeSection === "buttons" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bottoni</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {([
                    ["backgroundColor", "Sfondo"],
                    ["textColor", "Testo"],
                    ["hoverBackgroundColor", "Sfondo hover"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label className="text-xs">{label}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.buttons[key] as string}
                          onChange={(e) => updateButtons(key, e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border"
                        />
                        <Input
                          value={config.buttons[key] as string}
                          onChange={(e) => updateButtons(key, e.target.value)}
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {([
                    ["borderRadius", "Border radius"],
                    ["padding", "Padding"],
                    ["fontSize", "Dimensione"],
                    ["fontWeight", "Peso font"],
                    ["textTransform", "Trasformazione"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={String(config.buttons[key])}
                        onChange={(e) => updateButtons(key, e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
                {/* Preview */}
                <div className="rounded-lg border bg-muted/30 p-6">
                  <p className="mb-3 text-xs text-muted-foreground">Anteprima</p>
                  <button
                    type="button"
                    style={{
                      backgroundColor: config.buttons.backgroundColor as string,
                      color: config.buttons.textColor as string,
                      borderRadius: config.buttons.borderRadius as string,
                      padding: config.buttons.padding as string,
                      fontSize: config.buttons.fontSize as string,
                      fontWeight: config.buttons.fontWeight as number,
                      textTransform: config.buttons.textTransform as React.CSSProperties["textTransform"],
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Invia
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "card" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Card</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {([
                    ["backgroundColor", "Sfondo"],
                    ["borderColor", "Bordo"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label className="text-xs">{label}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.card[key]}
                          onChange={(e) => updateCard(key, e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border"
                        />
                        <Input
                          value={config.card[key]}
                          onChange={(e) => updateCard(key, e.target.value)}
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {([
                    ["borderWidth", "Spessore bordo"],
                    ["borderRadius", "Border radius"],
                    ["shadow", "Ombra"],
                    ["padding", "Padding"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={config.card[key]}
                        onChange={(e) => updateCard(key, e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
                {/* Preview */}
                <div className="rounded-lg border bg-muted/30 p-6">
                  <p className="mb-3 text-xs text-muted-foreground">Anteprima</p>
                  <div
                    style={{
                      backgroundColor: config.card.backgroundColor,
                      borderColor: config.card.borderColor,
                      borderWidth: config.card.borderWidth,
                      borderStyle: "solid",
                      borderRadius: config.card.borderRadius,
                      boxShadow: config.card.shadow,
                      padding: config.card.padding,
                    }}
                  >
                    <p style={{ color: config.colors.text, fontFamily: config.typography.fontFamily }}>
                      Contenuto di esempio
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

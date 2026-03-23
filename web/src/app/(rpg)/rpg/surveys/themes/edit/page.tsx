"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";

const ColorPicker = dynamic(
  () => import("react-best-gradient-color-picker").then((m) => m.default ?? m),
  { ssr: false },
);

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
  type ThemeDecoration,
} from "@/lib/api";
import { BUILTIN_DECORATIONS, getDecorationSrc, DECORATION_SIZE_MAP } from "@/lib/decorations";
import { isAuthenticated } from "@/lib/auth";
import { SkeletonPage } from "@/components/skeleton-page";

// ── Types ────────────────────────────────────────────────────────────

type Section = "colors" | "typography" | "spacing" | "buttons" | "card" | "decoration";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "colors", label: "Colori" },
  { key: "typography", label: "Tipografia" },
  { key: "spacing", label: "Spaziatura" },
  { key: "buttons", label: "Bottoni" },
  { key: "card", label: "Card" },
  { key: "decoration", label: "Decorazione" },
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
  surveyBackground: "Sfondo sondaggio",
};

// Fields that support gradients (in addition to solid colors)
const GRADIENT_FIELDS: Set<keyof ThemeColors> = new Set(["pageBackground", "surface", "surveyBackground"]);
const GRADIENT_BTN_FIELDS: Set<keyof ThemeButtons> = new Set(["backgroundColor"]);
const GRADIENT_CARD_FIELDS: Set<keyof ThemeCard> = new Set(["backgroundColor"]);


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
  const [openPicker, setOpenPicker] = useState<string | null>(null);

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

  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || !config) return;
    setSaving(true);
    setSaveError(null);
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
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Errore nel salvataggio");
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

  function updateCard<K extends keyof ThemeCard>(key: K, value: ThemeCard[K]) {
    if (!config) return;
    setConfig({ ...config, card: { ...config.card, [key]: value } });
  }

  function updateDecoration<K extends keyof ThemeDecoration>(key: K, value: ThemeDecoration[K]) {
    if (!config) return;
    setConfig({ ...config, decoration: { ...config.decoration, [key]: value } });
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

      {saveError && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{saveError}</p>
        </div>
      )}

      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Left: tabs + section content */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row">
          {/* Section tabs */}
          <div className="flex gap-1 overflow-x-auto lg:w-44 lg:shrink-0 lg:flex-col lg:gap-0.5">
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
          <div className="min-w-0 flex-1">
            {activeSection === "colors" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Colori</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {(Object.keys(COLOR_LABELS) as (keyof ThemeColors)[]).map((key) => {
                    const value = config.colors[key];
                    const supportsGradient = GRADIENT_FIELDS.has(key);
                    const pickerOpen = openPicker === key;

                    return (
                      <div key={key} className="flex flex-col gap-1.5">
                        <Label className="text-xs">{COLOR_LABELS[key]}</Label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setOpenPicker(pickerOpen ? null : key)}
                            className="h-8 w-8 shrink-0 cursor-pointer rounded border"
                            style={{ background: value }}
                          />
                          <Input
                            value={value}
                            onChange={(e) => updateColors(key, e.target.value)}
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                        {pickerOpen && (
                          <div className="relative z-10 mt-1 rounded-lg border bg-popover p-3 shadow-lg">
                            <ColorPicker
                              value={value}
                              onChange={(v: string) => updateColors(key, v)}
                              hideControls={!supportsGradient}
                              hidePresets
                              hideEyeDrop
                              hideAdvancedSliders
                              hideColorGuide
                              hideInputType
                              width={260}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                <CardContent className="grid gap-4 sm:grid-cols-2">
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([
                      ["backgroundColor", "Sfondo"],
                      ["textColor", "Testo"],
                      ["hoverBackgroundColor", "Sfondo hover"],
                    ] as const).map(([key, label]) => {
                      const val = config.buttons[key] as string;
                      const pickerKey = `btn-${key}`;
                      const pickerOpen = openPicker === pickerKey;
                      const hasGradient = GRADIENT_BTN_FIELDS.has(key);
                      return (
                        <div key={key} className="flex flex-col gap-1.5">
                          <Label className="text-xs">{label}</Label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setOpenPicker(pickerOpen ? null : pickerKey)}
                              className="h-8 w-8 shrink-0 cursor-pointer rounded border"
                              style={{ background: val }}
                            />
                            <Input
                              value={val}
                              onChange={(e) => updateButtons(key, e.target.value)}
                              className="flex-1 font-mono text-xs"
                            />
                          </div>
                          {pickerOpen && (
                            <div className="relative z-10 mt-1 rounded-lg border bg-popover p-3 shadow-lg">
                              <ColorPicker
                                value={val}
                                onChange={(v: string) => updateButtons(key, v)}
                                hideControls={!hasGradient}
                                hidePresets
                                hideEyeDrop
                                hideAdvancedSliders
                                hideColorGuide
                                hideInputType
                                width={260}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                </CardContent>
              </Card>
            )}

            {activeSection === "card" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Card</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([
                      ["backgroundColor", "Sfondo"],
                      ["borderColor", "Bordo"],
                    ] as const).map(([key, label]) => {
                      const val = config.card[key];
                      const pickerKey = `card-${key}`;
                      const pickerOpen = openPicker === pickerKey;
                      const hasGradient = GRADIENT_CARD_FIELDS.has(key);
                      return (
                        <div key={key} className="flex flex-col gap-1.5">
                          <Label className="text-xs">{label}</Label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setOpenPicker(pickerOpen ? null : pickerKey)}
                              className="h-8 w-8 shrink-0 cursor-pointer rounded border"
                              style={{ background: val }}
                            />
                            <Input
                              value={val}
                              onChange={(e) => updateCard(key, e.target.value)}
                              className="flex-1 font-mono text-xs"
                            />
                          </div>
                          {pickerOpen && (
                            <div className="relative z-10 mt-1 rounded-lg border bg-popover p-3 shadow-lg">
                              <ColorPicker
                                value={val}
                                onChange={(v: string) => updateCard(key, v)}
                                hideControls={!hasGradient}
                                hidePresets
                                hideEyeDrop
                                hideAdvancedSliders
                                hideColorGuide
                                hideInputType
                                width={260}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                  {/* Background opacity */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">
                      Opacit&agrave; sfondo: {Math.round(config.card.backgroundOpacity * 100)}%
                    </Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(config.card.backgroundOpacity * 100)}
                      onChange={(e) => updateCard("backgroundOpacity", Number(e.target.value) / 100)}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "decoration" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Decorazione</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {/* Type selector */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <div className="flex gap-2">
                      {([
                        ["none", "Nessuna"],
                        ["builtin", "Predefinita"],
                        ["url", "URL esterno"],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateDecoration("type", value)}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                            config.decoration.type === value
                              ? "bg-primary text-primary-foreground"
                              : "border bg-background text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Builtin selector */}
                  {config.decoration.type === "builtin" && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Illustrazione</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {BUILTIN_DECORATIONS.map((dec) => (
                          <button
                            key={dec.id}
                            type="button"
                            onClick={() => updateDecoration("builtinId", dec.id)}
                            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-colors ${
                              config.decoration.builtinId === dec.id
                                ? "border-primary bg-primary/5"
                                : "border-transparent bg-muted/50 hover:bg-muted"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={dec.src}
                              alt={dec.label}
                              className="h-16 w-16 object-contain"
                            />
                            <span className="text-xs">{dec.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* URL input */}
                  {config.decoration.type === "url" && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">URL immagine</Label>
                      <Input
                        value={config.decoration.url ?? ""}
                        onChange={(e) => updateDecoration("url", e.target.value || null)}
                        placeholder="https://example.com/image.svg"
                        className="font-mono text-xs"
                      />
                      {config.decoration.url && (
                        <div className="mt-1 flex justify-center rounded-lg border bg-muted/30 p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={config.decoration.url}
                            alt="Anteprima"
                            className="h-20 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {config.decoration.type !== "none" && (
                    <>
                      {/* Position */}
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">Posizione</Label>
                        <div className="flex gap-2">
                          {([
                            ["right", "Destra"],
                            ["left", "Sinistra"],
                            ["background", "Sfondo"],
                          ] as const).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => updateDecoration("position", value)}
                              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                config.decoration.position === value
                                  ? "bg-primary text-primary-foreground"
                                  : "border bg-background text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Size — hidden for background position */}
                      {config.decoration.position !== "background" && (
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs">Dimensione</Label>
                          <select
                            value={config.decoration.size}
                            onChange={(e) => updateDecoration("size", e.target.value as ThemeDecoration["size"])}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="small">Piccola (25%)</option>
                            <option value="medium">Media (33%)</option>
                            <option value="large">Grande (40%)</option>
                          </select>
                        </div>
                      )}

                      {/* Opacity */}
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">
                          Opacita: {Math.round(config.decoration.opacity * 100)}%
                        </Label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(config.decoration.opacity * 100)}
                          onChange={(e) => updateDecoration("opacity", Number(e.target.value) / 100)}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="xl:w-80 xl:shrink-0">
          <div className="sticky top-16">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Anteprima</p>
            <ThemeMiniPreview config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Live mini preview ───────────────────────────────────────────────

function ThemeMiniPreview({ config }: { config: ThemeConfig }) {
  const c = config.colors;
  const ty = config.typography;
  const sp = config.spacing;
  const btn = config.buttons;
  const cd = config.card;
  const dec = config.decoration;

  const decorationSrc = getDecorationSrc(dec.type, dec.builtinId, dec.url);
  const hasDecoration = dec.type !== "none" && !!decorationSrc;

  const isBgDecoration = hasDecoration && dec.position === "background";
  const isSideDecoration = hasDecoration && dec.position !== "background";

  return (
    <div
      style={{
        position: "relative",
        background: c.pageBackground,
        borderRadius: sp.borderRadius,
        padding: "16px",
        display: isSideDecoration ? "flex" : undefined,
        flexDirection: isSideDecoration && dec.position === "left" ? "row-reverse" : undefined,
        gap: isSideDecoration ? "8px" : undefined,
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      {isBgDecoration && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decorationSrc!}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              opacity: dec.opacity,
            }}
          />
        </div>
      )}
      {/* Card */}
      <div
        style={{
          position: "relative",
          flex: isSideDecoration ? 1 : undefined,
          minWidth: 0,
          borderColor: cd.borderColor,
          borderWidth: cd.borderWidth,
          borderStyle: "solid",
          borderRadius: cd.borderRadius,
          boxShadow: cd.shadow,
          padding: cd.padding,
          fontFamily: ty.fontFamily,
          color: c.text,
          fontSize: ty.bodySize as string,
          lineHeight: String(ty.lineHeight),
          overflow: "hidden",
        }}
      >
        {/* Card background layer with opacity — transparent reveals decoration behind */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: c.surveyBackground,
            opacity: cd.backgroundOpacity,
            pointerEvents: "none",
            borderRadius: "inherit",
          }}
        />
        {/* Content above background layer */}
        <div style={{ position: "relative" }}>
        {/* Title */}
        <h3
          style={{
            fontSize: ty.titleSize as string,
            fontWeight: ty.titleWeight as number,
            fontFamily: (ty.fontFamilyHeading ?? ty.fontFamily) as string,
            color: c.text,
            margin: "0 0 4px 0",
          }}
        >
          Titolo modulo
        </h3>
        <p
          style={{
            fontSize: ty.subtitleSize as string,
            color: c.textSecondary,
            margin: "0 0 16px 0",
          }}
        >
          Descrizione del modulo di esempio
        </p>

        {/* Text field */}
        <div style={{ marginBottom: sp.fieldGap }}>
          <label
            style={{
              display: "block",
              fontSize: ty.labelSize as string,
              fontWeight: ty.labelWeight as number,
              marginBottom: "4px",
            }}
          >
            Nome <span style={{ color: c.required }}>*</span>
          </label>
          <div
            style={{
              backgroundColor: c.inputBackground,
              border: `${sp.inputBorderWidth} solid ${c.inputBorder}`,
              borderRadius: sp.inputBorderRadius,
              padding: sp.inputPadding,
              fontSize: ty.bodySize as string,
              color: c.textSecondary,
            }}
          >
            Scrivi qui...
          </div>
        </div>

        {/* Radio options */}
        <div style={{ marginBottom: sp.fieldGap }}>
          <label
            style={{
              display: "block",
              fontSize: ty.labelSize as string,
              fontWeight: ty.labelWeight as number,
              marginBottom: "4px",
            }}
          >
            Valutazione
          </label>
          <div
            style={{
              border: `1px solid ${c.border}`,
              borderRadius: sp.inputBorderRadius,
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {["Ottimo", "Buono", "Sufficiente"].map((opt, i) => (
              <label
                key={opt}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: ty.bodySize as string,
                  cursor: "default",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    border: `2px solid ${i === 0 ? c.primary : c.inputBorder}`,
                    backgroundColor: i === 0 ? c.primary : "transparent",
                    flexShrink: 0,
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="button"
          style={{
            width: "100%",
            background: btn.backgroundColor as string,
            color: btn.textColor as string,
            borderRadius: btn.borderRadius as string,
            padding: btn.padding as string,
            fontSize: btn.fontSize as string,
            fontWeight: btn.fontWeight as number,
            textTransform: btn.textTransform as React.CSSProperties["textTransform"],
            border: "none",
            cursor: "default",
          }}
        >
          Invia
        </button>
        </div>
      </div>
      {/* Decoration panel (side only) */}
      {isSideDecoration && (
        <div
          style={{
            width: DECORATION_SIZE_MAP[dec.size] ?? "33%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: sp.borderRadius,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decorationSrc!}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              opacity: dec.opacity,
            }}
          />
        </div>
      )}
    </div>
  );
}

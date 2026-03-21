import { z } from "zod";

// ── Helpers ──────────────────────────────────────────────────────────

const cssColorSchema = z
  .string()
  .regex(
    /^(#[0-9a-fA-F]{3,8}|rgba?\(.+\)|hsla?\(.+\)|transparent|inherit)$/,
    "Invalid CSS color",
  );

const cssSizeSchema = z
  .string()
  .regex(/^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/, "Invalid CSS size");

const cssFontWeightSchema = z.union([
  z.enum([
    "100", "200", "300", "400", "500", "600", "700", "800", "900",
    "normal", "bold",
  ]),
  z.number().int().min(100).max(900),
]);

// ── Default config ──────────────────────────────────────────────────

export const DEFAULT_THEME_CONFIG = {
  colors: {
    pageBackground: "#f0f2f5",
    surface: "#ffffff",
    primary: "#1976d2",
    primaryHover: "#1565c0",
    text: "#212121",
    textSecondary: "#757575",
    border: "#e0e0e0",
    error: "#d32f2f",
    success: "#388e3c",
    warning: "#f57c00",
    inputBackground: "#ffffff",
    inputBorder: "#bdbdbd",
    inputFocus: "#1976d2",
    selectionHighlight: "rgba(25,118,210,0.08)",
    required: "#d32f2f",
  },
  typography: {
    fontFamily: "Inter, -apple-system, sans-serif",
    fontFamilyHeading: null as string | null,
    titleSize: "28px",
    titleWeight: "700" as const,
    subtitleSize: "16px",
    subtitleWeight: "400" as const,
    sectionTitleSize: "18px",
    sectionTitleWeight: "600" as const,
    labelSize: "14px",
    labelWeight: "600" as const,
    bodySize: "14px",
    bodyWeight: "400" as const,
    lineHeight: "1.5" as string | number,
  },
  spacing: {
    formMaxWidth: "720px",
    formPadding: "32px",
    formPaddingMobile: "16px",
    sectionGap: "28px",
    fieldGap: "20px",
    borderRadius: "8px",
    inputPadding: "12px",
    inputBorderRadius: "6px",
    inputBorderWidth: "1px",
  },
  buttons: {
    backgroundColor: "#1976d2",
    textColor: "#ffffff",
    hoverBackgroundColor: "#1565c0",
    borderRadius: "6px",
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: "600" as const,
    textTransform: "none" as const,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e0e0e0",
    borderWidth: "1px",
    borderRadius: "12px",
    shadow: "0 2px 8px rgba(0,0,0,0.08)",
    padding: "32px",
  },
};

// ── Sub-schemas ─────────────────────────────────────────────────────

const d = DEFAULT_THEME_CONFIG;

const themeColorsSchema = z.object({
  pageBackground:     cssColorSchema.default(d.colors.pageBackground),
  surface:            cssColorSchema.default(d.colors.surface),
  primary:            cssColorSchema.default(d.colors.primary),
  primaryHover:       cssColorSchema.default(d.colors.primaryHover),
  text:               cssColorSchema.default(d.colors.text),
  textSecondary:      cssColorSchema.default(d.colors.textSecondary),
  border:             cssColorSchema.default(d.colors.border),
  error:              cssColorSchema.default(d.colors.error),
  success:            cssColorSchema.default(d.colors.success),
  warning:            cssColorSchema.default(d.colors.warning),
  inputBackground:    cssColorSchema.default(d.colors.inputBackground),
  inputBorder:        cssColorSchema.default(d.colors.inputBorder),
  inputFocus:         cssColorSchema.default(d.colors.inputFocus),
  selectionHighlight: cssColorSchema.default(d.colors.selectionHighlight),
  required:           cssColorSchema.default(d.colors.required),
});

const themeTypographySchema = z.object({
  fontFamily:         z.string().default(d.typography.fontFamily),
  fontFamilyHeading:  z.string().nullable().default(null),
  titleSize:          cssSizeSchema.default(d.typography.titleSize),
  titleWeight:        cssFontWeightSchema.default("700"),
  subtitleSize:       cssSizeSchema.default(d.typography.subtitleSize),
  subtitleWeight:     cssFontWeightSchema.default("400"),
  sectionTitleSize:   cssSizeSchema.default(d.typography.sectionTitleSize),
  sectionTitleWeight: cssFontWeightSchema.default("600"),
  labelSize:          cssSizeSchema.default(d.typography.labelSize),
  labelWeight:        cssFontWeightSchema.default("600"),
  bodySize:           cssSizeSchema.default(d.typography.bodySize),
  bodyWeight:         cssFontWeightSchema.default("400"),
  lineHeight:         z.union([z.number(), z.string()]).default("1.5"),
});

const themeSpacingSchema = z.object({
  formMaxWidth:       cssSizeSchema.default(d.spacing.formMaxWidth),
  formPadding:        cssSizeSchema.default(d.spacing.formPadding),
  formPaddingMobile:  cssSizeSchema.default(d.spacing.formPaddingMobile),
  sectionGap:         cssSizeSchema.default(d.spacing.sectionGap),
  fieldGap:           cssSizeSchema.default(d.spacing.fieldGap),
  borderRadius:       cssSizeSchema.default(d.spacing.borderRadius),
  inputPadding:       cssSizeSchema.default(d.spacing.inputPadding),
  inputBorderRadius:  cssSizeSchema.default(d.spacing.inputBorderRadius),
  inputBorderWidth:   cssSizeSchema.default(d.spacing.inputBorderWidth),
});

const themeButtonsSchema = z.object({
  backgroundColor:      cssColorSchema.default(d.buttons.backgroundColor),
  textColor:            cssColorSchema.default(d.buttons.textColor),
  hoverBackgroundColor: cssColorSchema.default(d.buttons.hoverBackgroundColor),
  borderRadius:         cssSizeSchema.default(d.buttons.borderRadius),
  padding:              z.string().default(d.buttons.padding),
  fontSize:             cssSizeSchema.default(d.buttons.fontSize),
  fontWeight:           cssFontWeightSchema.default("600"),
  textTransform:        z.enum(["none", "uppercase", "capitalize"]).default("none"),
});

const themeCardSchema = z.object({
  backgroundColor: cssColorSchema.default(d.card.backgroundColor),
  borderColor:     cssColorSchema.default(d.card.borderColor),
  borderWidth:     cssSizeSchema.default(d.card.borderWidth),
  borderRadius:    cssSizeSchema.default(d.card.borderRadius),
  shadow:          z.string().default(d.card.shadow),
  padding:         cssSizeSchema.default(d.card.padding),
});

// ── Main config schema ──────────────────────────────────────────────

export const themeConfigSchema = z.object({
  colors:     themeColorsSchema.default(d.colors),
  typography: themeTypographySchema.default(d.typography),
  spacing:    themeSpacingSchema.default(d.spacing),
  buttons:    themeButtonsSchema.default(d.buttons),
  card:       themeCardSchema.default(d.card),
});

// ── CRUD schemas ────────────────────────────────────────────────────

const uuidPattern = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID",
);

export const createThemeSchema = z.object({
  name:        z.string().trim().min(1).max(255),
  description: z.string().trim().max(1000).optional().nullable(),
  isPublic:    z.boolean().default(false),
  config:      themeConfigSchema.optional(),
});

export const updateThemeSchema = z.object({
  name:        z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  isPublic:    z.boolean().optional(),
  config:      themeConfigSchema.optional(),
}).refine((obj) => Object.keys(obj).length > 0, "At least one field required");

export const patchThemeSectionSchema = z.object({
  section: z.enum(["colors", "typography", "spacing", "buttons", "card"]),
  data: z.record(z.string(), z.unknown()),
});

export const applyThemeSchema = z.object({
  themeId: uuidPattern.nullable(),
});

// ── Exported types ──────────────────────────────────────────────────

export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type CreateThemeInput = z.infer<typeof createThemeSchema>;
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;

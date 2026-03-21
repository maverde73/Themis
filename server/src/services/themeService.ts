import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import { DEFAULT_THEME_CONFIG } from "../types/themeSchemas";
import type { CreateThemeInput, UpdateThemeInput, ThemeConfig } from "../types/themeSchemas";

function deepMerge(defaults: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    if (
      typeof defaults[key] === "object" &&
      defaults[key] !== null &&
      !Array.isArray(defaults[key]) &&
      typeof overrides[key] === "object" &&
      overrides[key] !== null &&
      !Array.isArray(overrides[key])
    ) {
      result[key] = deepMerge(
        defaults[key] as Record<string, unknown>,
        overrides[key] as Record<string, unknown>,
      );
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

export async function listThemes(
  orgId: string,
  options?: { includeBuiltin?: boolean; includePublic?: boolean; page?: number; limit?: number },
) {
  const { includeBuiltin = true, includePublic = true, page = 1, limit = 50 } = options ?? {};

  const where = {
    OR: [
      { orgId },
      ...(includeBuiltin ? [{ isBuiltin: true }] : []),
      ...(includePublic ? [{ isPublic: true, orgId: { not: orgId } }] : []),
    ],
  };

  const [themes, total] = await Promise.all([
    prisma.surveyTheme.findMany({
      where,
      orderBy: [{ isBuiltin: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.surveyTheme.count({ where }),
  ]);

  return { themes, total, page, limit };
}

export async function getThemeById(id: string) {
  const theme = await prisma.surveyTheme.findUnique({ where: { id } });
  if (!theme) throw new AppError(404, "Theme not found");
  return theme;
}

export async function createTheme(input: CreateThemeInput, userId: string, orgId: string) {
  const config = deepMerge(
    DEFAULT_THEME_CONFIG as unknown as Record<string, unknown>,
    (input.config ?? {}) as Record<string, unknown>,
  );

  return prisma.surveyTheme.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      isPublic: input.isPublic ?? false,
      config: JSON.parse(JSON.stringify(config)),
      createdBy: userId,
      orgId,
    },
  });
}

export async function updateTheme(id: string, input: UpdateThemeInput, userId: string) {
  const theme = await prisma.surveyTheme.findUnique({ where: { id } });
  if (!theme) throw new AppError(404, "Theme not found");
  if (theme.isBuiltin) throw new AppError(403, "Cannot modify builtin themes");
  if (theme.createdBy !== userId) throw new AppError(403, "Not authorized to modify this theme");

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.isPublic !== undefined) updates.isPublic = input.isPublic;
  if (input.config !== undefined) {
    updates.config = JSON.parse(JSON.stringify(
      deepMerge(
        theme.config as Record<string, unknown>,
        input.config as Record<string, unknown>,
      ),
    ));
  }

  return prisma.surveyTheme.update({ where: { id }, data: updates });
}

export async function patchThemeSection(
  id: string,
  section: string,
  data: Record<string, unknown>,
  userId: string,
) {
  const theme = await prisma.surveyTheme.findUnique({ where: { id } });
  if (!theme) throw new AppError(404, "Theme not found");
  if (theme.isBuiltin) throw new AppError(403, "Cannot modify builtin themes");
  if (theme.createdBy !== userId) throw new AppError(403, "Not authorized to modify this theme");

  const config = theme.config as Record<string, unknown>;
  const currentSection = (config[section] ?? {}) as Record<string, unknown>;
  config[section] = { ...currentSection, ...data };

  return prisma.surveyTheme.update({
    where: { id },
    data: { config: JSON.parse(JSON.stringify(config)) },
  });
}

export async function cloneTheme(id: string, userId: string, orgId: string, newName?: string) {
  const theme = await prisma.surveyTheme.findUnique({ where: { id } });
  if (!theme) throw new AppError(404, "Theme not found");

  return prisma.surveyTheme.create({
    data: {
      name: newName ?? `${theme.name} (copia)`,
      description: theme.description,
      config: JSON.parse(JSON.stringify(theme.config)),
      clonedFrom: id,
      createdBy: userId,
      orgId,
    },
  });
}

export async function deleteTheme(id: string, userId: string) {
  const theme = await prisma.surveyTheme.findUnique({ where: { id } });
  if (!theme) throw new AppError(404, "Theme not found");
  if (theme.isBuiltin) throw new AppError(403, "Cannot delete builtin themes");
  if (theme.createdBy !== userId) throw new AppError(403, "Not authorized to delete this theme");

  // Unlink surveys using this theme
  await prisma.survey.updateMany({
    where: { themeId: id },
    data: { themeId: null },
  });

  return prisma.surveyTheme.delete({ where: { id } });
}

export async function applyThemeToSurvey(surveyId: string, themeId: string | null) {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) throw new AppError(404, "Survey not found");

  if (themeId) {
    const theme = await prisma.surveyTheme.findUnique({ where: { id: themeId } });
    if (!theme) throw new AppError(404, "Theme not found");
  }

  return prisma.survey.update({
    where: { id: surveyId },
    data: { themeId },
    include: { theme: { select: { id: true, name: true, config: true } } },
  });
}

export function getDefaultConfig() {
  return DEFAULT_THEME_CONFIG;
}

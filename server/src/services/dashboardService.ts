import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import { resolveDashboard, type DashboardConfig } from "./dashboardDataService";

export async function listDashboards(orgId: string, surveyId?: string, channel?: string) {
  return prisma.dashboard.findMany({
    where: {
      orgId,
      ...(surveyId ? { surveyId } : {}),
      ...(channel ? { channel } : {}),
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function getDashboard(id: string) {
  const dashboard = await prisma.dashboard.findUnique({ where: { id } });
  if (!dashboard) throw new AppError(404, "Dashboard not found");
  return dashboard;
}

export async function getDashboardWithData(id: string, userAccessLevel: number) {
  const dashboard = await prisma.dashboard.findUnique({ where: { id } });
  if (!dashboard) throw new AppError(404, "Dashboard not found");

  const config = dashboard.config as unknown as DashboardConfig;
  const resolved = await resolveDashboard(dashboard.orgId, config, userAccessLevel);

  return { ...dashboard, resolvedData: resolved };
}

export async function createDashboard(data: {
  orgId: string;
  title: string;
  config: DashboardConfig;
  surveyId?: string;
  channel?: string;
  accessLevel?: number;
  isDefault?: boolean;
}) {
  return prisma.dashboard.create({
    data: {
      orgId: data.orgId,
      title: data.title,
      config: data.config as object,
      surveyId: data.surveyId,
      channel: data.channel,
      accessLevel: data.accessLevel ?? 1,
      isDefault: data.isDefault ?? false,
    },
  });
}

export async function updateDashboard(id: string, data: {
  title?: string;
  config?: DashboardConfig;
  accessLevel?: number;
  isDefault?: boolean;
}) {
  const existing = await prisma.dashboard.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Dashboard not found");

  return prisma.dashboard.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.config !== undefined && { config: data.config as object }),
      ...(data.accessLevel !== undefined && { accessLevel: data.accessLevel }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    },
  });
}

export async function deleteDashboard(id: string) {
  const existing = await prisma.dashboard.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Dashboard not found");

  return prisma.dashboard.delete({ where: { id } });
}

// ── Templates ───────────────────────────────────────────────────────

export async function listTemplates() {
  return prisma.dashboardTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });
}

export async function importTemplate(orgId: string, templateId: string) {
  const template = await prisma.dashboardTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new AppError(404, "Dashboard template not found");

  const config = template.config as unknown as DashboardConfig;
  const title = (template.catalogTitle as Record<string, string>)?.it
    || (template.catalogTitle as Record<string, string>)?.en
    || "Dashboard";

  return prisma.dashboard.create({
    data: {
      orgId,
      title,
      config: config as object,
      isDefault: true,
    },
  });
}

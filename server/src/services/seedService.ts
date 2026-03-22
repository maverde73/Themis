import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "../utils/prisma";
import { config } from "../utils/config";

export async function seedSuperAdmin(): Promise<void> {
  if (!config.superAdminEmail || !config.superAdminPassword) {
    return;
  }

  const hashedPassword = await bcrypt.hash(config.superAdminPassword, 10);
  await prisma.user.upsert({
    where: { email: config.superAdminEmail },
    update: {},
    create: {
      email: config.superAdminEmail,
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });
}

export async function seedDashboardTemplates(): Promise<void> {
  const templatePath = join(__dirname, "../templates/cruscotto-pdr125.json");
  const raw = readFileSync(templatePath, "utf-8");
  const template = JSON.parse(raw) as {
    slug: string;
    catalogTitle: Record<string, string>;
    catalogDescription: Record<string, string>;
    config: object;
  };

  await prisma.dashboardTemplate.upsert({
    where: { slug: template.slug },
    update: {
      config: template.config,
      catalogTitle: template.catalogTitle,
      catalogDescription: template.catalogDescription,
    },
    create: {
      slug: template.slug,
      config: template.config,
      catalogTitle: template.catalogTitle,
      catalogDescription: template.catalogDescription,
    },
  });
}

import app from "./app";
import { config } from "./utils/config";
import { prisma } from "./utils/prisma";
import { startSlaChecker } from "./jobs/slaChecker";
import { seedTemplates } from "./services/templateService";
import { seedSuperAdmin, seedDashboardTemplates } from "./services/seedService";
import { startNostrSubscriber } from "./services/nostrService";

async function main() {
  await prisma.$connect();
  console.log("Database connected");

  await seedTemplates();
  await seedDashboardTemplates();
  await seedSuperAdmin();
  startSlaChecker();
  startNostrSubscriber();

  app.listen(config.port, () => {
    console.log(`Themis server running on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

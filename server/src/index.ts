import app from "./app";
import { config } from "./utils/config";
import { prisma } from "./utils/prisma";
import { startSlaChecker } from "./jobs/slaChecker";

async function main() {
  await prisma.$connect();
  console.log("Database connected");

  startSlaChecker();

  app.listen(config.port, () => {
    console.log(`Themis server running on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

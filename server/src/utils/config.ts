import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "postgresql://themis:themis_dev@localhost:5432/themis",
  jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
  aiProvider: process.env.AI_PROVIDER || "anthropic",
  aiModel: process.env.AI_MODEL || "claude-sonnet-4-20250514",
  aiApiKey: process.env.AI_API_KEY || "",
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || "",
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || "",
  nostrPrivkey: process.env.NOSTR_PRIVKEY || "",
  relayUrls: (process.env.RELAY_URLS || "ws://localhost:7777").split(",").map((s) => s.trim()),
  nostrPowDifficulty: parseInt(process.env.NOSTR_POW_DIFFICULTY || "20", 10),
} as const;

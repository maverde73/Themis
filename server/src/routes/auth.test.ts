import crypto from "crypto";
import request from "supertest";
import app from "../app";
import { prisma } from "../utils/prisma";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000099";
const PAIRING_SECRET = crypto.randomBytes(32).toString("hex");

function generateAnonProof(orgId: string, secret: string, timestamp: number, nonce: string): string {
  const message = `${orgId}|${timestamp}|${nonce}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

beforeAll(async () => {
  await prisma.organization.upsert({
    where: { id: TEST_ORG_ID },
    update: { pairingSecret: PAIRING_SECRET },
    create: {
      id: TEST_ORG_ID,
      name: "Auth Test Org",
      plan: "STARTER",
      relayUrls: ["ws://localhost:7777"],
      pairingSecret: PAIRING_SECRET,
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { orgId: TEST_ORG_ID } });
  await prisma.organization.delete({ where: { id: TEST_ORG_ID } });
  await prisma.$disconnect();
});

describe("POST /api/v1/auth/register", () => {
  it("registers a new user", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "test-auth@example.com",
      password: "password123",
      role: "RPG",
      orgId: TEST_ORG_ID,
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test-auth@example.com");
    expect(res.body.user.role).toBe("RPG");
    expect(res.body.token).toBeDefined();
  });

  it("rejects duplicate email", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "test-auth@example.com",
      password: "password123",
      role: "RPG",
      orgId: TEST_ORG_ID,
    });
    expect(res.status).toBe(409);
  });

  it("rejects invalid input", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "not-an-email",
      password: "short",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
  });
});

describe("POST /api/v1/auth/login", () => {
  it("logs in with valid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test-auth@example.com",
      password: "password123",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("test-auth@example.com");
  });

  it("rejects wrong password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test-auth@example.com",
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
  });

  it("rejects non-existent email", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "nobody@example.com",
      password: "password123",
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/anonymous", () => {
  it("issues anonymous token with valid HMAC proof", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const proof = generateAnonProof(TEST_ORG_ID, PAIRING_SECRET, timestamp, nonce);

    const res = await request(app).post("/api/v1/auth/anonymous").send({
      orgId: TEST_ORG_ID,
      timestamp,
      nonce,
      proof,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects invalid HMAC proof", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const res = await request(app).post("/api/v1/auth/anonymous").send({
      orgId: TEST_ORG_ID,
      timestamp,
      nonce,
      proof: "0".repeat(64),
    });
    expect(res.status).toBe(401);
  });

  it("rejects expired timestamp", async () => {
    const timestamp = Math.floor(Date.now() / 1000) - 60; // 60s ago
    const nonce = crypto.randomUUID();
    const proof = generateAnonProof(TEST_ORG_ID, PAIRING_SECRET, timestamp, nonce);

    const res = await request(app).post("/api/v1/auth/anonymous").send({
      orgId: TEST_ORG_ID,
      timestamp,
      nonce,
      proof,
    });
    expect(res.status).toBe(401);
  });

  it("rejects replayed nonce", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const proof = generateAnonProof(TEST_ORG_ID, PAIRING_SECRET, timestamp, nonce);

    // First request succeeds
    const res1 = await request(app).post("/api/v1/auth/anonymous").send({
      orgId: TEST_ORG_ID,
      timestamp,
      nonce,
      proof,
    });
    expect(res1.status).toBe(200);

    // Same nonce fails
    const res2 = await request(app).post("/api/v1/auth/anonymous").send({
      orgId: TEST_ORG_ID,
      timestamp,
      nonce,
      proof,
    });
    expect(res2.status).toBe(401);
  });

  it("rejects org without pairing secret", async () => {
    const noSecretOrgId = "00000000-0000-0000-0000-000000000098";
    await prisma.organization.upsert({
      where: { id: noSecretOrgId },
      update: {},
      create: {
        id: noSecretOrgId,
        name: "No Secret Org",
        plan: "STARTER",
        relayUrls: ["ws://localhost:7777"],
      },
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const res = await request(app).post("/api/v1/auth/anonymous").send({
      orgId: noSecretOrgId,
      timestamp,
      nonce,
      proof: "0".repeat(64),
    });
    expect(res.status).toBe(400);

    await prisma.organization.delete({ where: { id: noSecretOrgId } });
  });
});

import request from "supertest";
import app from "../app";
import { prisma } from "../utils/prisma";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000099";

beforeAll(async () => {
  await prisma.organization.upsert({
    where: { id: TEST_ORG_ID },
    update: {},
    create: {
      id: TEST_ORG_ID,
      name: "Auth Test Org",
      plan: "STARTER",
      relayUrls: ["ws://localhost:7777"],
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

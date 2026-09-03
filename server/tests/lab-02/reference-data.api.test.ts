import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

// API-03b (tests.md): GET /api/categories and GET /api/related-systems must
// only return active reference data, matching the ticket-creation
// dropdowns' requirement to never offer an inactive Category or Related
// System.
describe("Reference data endpoints only return active rows", () => {
  let inactiveCategoryId: number;
  let inactiveSystemId: number;

  beforeAll(async () => {
    const inactiveCategory = await prisma.category.create({
      data: {
        name: `Inactive Category ${Date.now()}`,
        isActive: false,
      },
    });
    inactiveCategoryId = inactiveCategory.id;

    const inactiveSystem = await prisma.relatedSystem.create({
      data: {
        name: `Inactive System ${Date.now()}`,
        isActive: false,
      },
    });
    inactiveSystemId = inactiveSystem.id;
  });

  afterAll(async () => {
    await prisma.category.delete({ where: { id: inactiveCategoryId } });
    await prisma.relatedSystem.delete({ where: { id: inactiveSystemId } });
  });

  it("GET /api/categories returns 200 and excludes inactive categories", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // The four required categories must be present.
    const names = res.body.map((c: { name: string }) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Account and Access",
        "Hardware",
        "Software",
        "Network",
      ])
    );
    // The freshly created inactive category must never appear.
    const ids = res.body.map((c: { id: number }) => c.id);
    expect(ids).not.toContain(inactiveCategoryId);
  });

  it("GET /api/related-systems returns 200 and excludes inactive related systems", async () => {
    const res = await request(app).get("/api/related-systems");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(6);

    const ids = res.body.map((s: { id: number }) => s.id);
    expect(ids).not.toContain(inactiveSystemId);

    res.body.forEach((system: { isActive: boolean }) => {
      expect(system.isActive).toBe(true);
    });
  });

  it("GET /api/systems (alias) returns the same active-only result as /api/related-systems", async () => {
    const res = await request(app).get("/api/systems");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((s: { id: number }) => s.id);
    expect(ids).not.toContain(inactiveSystemId);
  });
});

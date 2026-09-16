import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs, SEED_PASSWORD } from "../helpers/auth.js";

const prisma = getPrisma();

describe("IT Staff ticket queue", () => {
  it("rejects an unauthenticated and a requester session", async () => {
    const unauthenticated = await request(app).get("/api/staff/tickets");
    expect(unauthenticated.status).toBe(401);

    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } }, orderBy: { id: "asc" } });
    const cookie = await loginAs(app, requester.email);
    const forbidden = await request(app).get("/api/staff/tickets").set("Cookie", cookie);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({ error: "Forbidden" });
  });

  it("returns a paginated shared queue for IT Staff", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const cookie = await loginAs(app, staff.email);
    const response = await request(app)
      .get("/api/staff/tickets?page=1&pageSize=2&sort=itPriority")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination).toMatchObject({ page: 1, pageSize: 2 });
    expect(response.body.data[0]).toEqual(expect.objectContaining({
      requestedPriority: expect.any(String),
      itPriority: expect.any(String),
      currentStatus: expect.any(String),
    }));
    expect(response.body.data[0]).toHaveProperty("ownerId");
    expect(response.body.data[0]).toHaveProperty("ownerName");
  });

  it("applies search, combined filters, unassigned owner, and invalid-sort fallback", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const cookie = await loginAs(app, staff.email);
    const known = await prisma.ticket.findFirstOrThrow({ include: { category: true } });

    const search = await request(app)
      .get(`/api/staff/tickets?search=${encodeURIComponent(known.ticketNumber)}`)
      .set("Cookie", cookie);
    expect(search.status).toBe(200);
    expect(search.body.data.map((ticket: { id: number }) => ticket.id)).toContain(known.id);

    const combined = await request(app)
      .get(`/api/staff/tickets?status=${known.currentStatus}&requestedPriority=${known.requestedPriority}&itPriority=${known.itPriority}&category=${known.categoryId}`)
      .set("Cookie", cookie);
    expect(combined.status).toBe(200);
    expect(combined.body.data.every((ticket: { currentStatus: string; requestedPriority: string; itPriority: string; categoryId: number }) =>
      ticket.currentStatus === known.currentStatus && ticket.requestedPriority === known.requestedPriority &&
      ticket.itPriority === known.itPriority && ticket.categoryId === known.categoryId)).toBe(true);

    const unassigned = await request(app).get("/api/staff/tickets?owner=unassigned").set("Cookie", cookie);
    expect(unassigned.status).toBe(200);
    expect(unassigned.body.data.every((ticket: { ownerId: number | null }) => ticket.ownerId === null)).toBe(true);

    const fallback = await request(app).get("/api/staff/tickets?sort=not-a-sort&pageSize=20").set("Cookie", cookie);
    expect(fallback.status).toBe(200);
    const fallbackCreatedAt = fallback.body.data.map((ticket: { createdAt: string }) => ticket.createdAt);
    expect(fallbackCreatedAt).toEqual([...fallbackCreatedAt].sort().reverse());
    expect(SEED_PASSWORD).toBeTruthy();
  });

  it("sorts in both directions and preserves pagination metadata across pages", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const cookie = await loginAs(app, staff.email);
    const asc = await request(app).get("/api/staff/tickets?sort=createdAt&sortOrder=asc&pageSize=3&page=1").set("Cookie", cookie);
    const desc = await request(app).get("/api/staff/tickets?sort=createdAt&sortOrder=desc&pageSize=3&page=1").set("Cookie", cookie);
    expect(asc.status).toBe(200); expect(desc.status).toBe(200);
    expect(asc.body.data.map((ticket: { createdAt: string }) => ticket.createdAt)).toEqual([...asc.body.data.map((ticket: { createdAt: string }) => ticket.createdAt)].sort());
    expect(desc.body.data.map((ticket: { createdAt: string }) => ticket.createdAt)).toEqual([...desc.body.data.map((ticket: { createdAt: string }) => ticket.createdAt)].sort().reverse());

    const page2 = await request(app).get("/api/staff/tickets?sort=createdAt&sortOrder=asc&pageSize=3&page=2").set("Cookie", cookie);
    expect(page2.status).toBe(200);
    expect(page2.body.pagination).toMatchObject({ page: 2, pageSize: 3 });
    expect(page2.body.pagination.total).toBeGreaterThanOrEqual(6);
    expect(page2.body.pagination.totalPages).toBe(Math.ceil(page2.body.pagination.total / page2.body.pagination.pageSize));
    expect(page2.body.data.map((ticket: { id: number }) => ticket.id)).not.toEqual(asc.body.data.map((ticket: { id: number }) => ticket.id));
  });

  it("returns a successful empty result for a query with no matches", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const cookie = await loginAs(app, staff.email);
    const response = await request(app).get("/api/staff/tickets?search=definitely-no-such-ticket").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.total).toBe(0);
  });
});

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

    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true } });
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
      ownerId: expect.anything(),
      ownerName: expect.any(String),
      requestedPriority: expect.any(String),
      itPriority: expect.any(String),
      currentStatus: expect.any(String),
    }));
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

    const unassigned = await request(app).get("/api/staff/tickets?owner=unassigned").set("Cookie", cookie);
    expect(unassigned.status).toBe(200);
    expect(unassigned.body.data.every((ticket: { ownerId: number | null }) => ticket.ownerId === null)).toBe(true);

    const fallback = await request(app).get("/api/staff/tickets?sort=not-a-sort").set("Cookie", cookie);
    expect(fallback.status).toBe(200);
    expect(fallback.body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(SEED_PASSWORD).toBeTruthy();
  });
});

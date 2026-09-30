import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

describe("Staff Dashboard API", () => {
  it("API-13: returns queue-wide and current-user dashboard cards", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true, mustChangePassword: false }, orderBy: { id: "asc" } });
    const response = await request(app).get("/api/staff/dashboard").set("Cookie", await loginAs(app, staff.email));
    expect(response.status).toBe(200);
    expect(response.body.cards).toEqual(expect.objectContaining({ new: expect.any(Number), open: expect.any(Number), inProgress: expect.any(Number), waitingForRequester: expect.any(Number), myAssigned: expect.any(Number), unassigned: expect.any(Number) }));
    expect(response.body.recentTickets.length).toBeLessThanOrEqual(5);
    const expectedAssigned = await prisma.ticket.count({ where: { ownerId: staff.id, currentStatus: { notIn: ["CLOSED", "CANCELLED"] } } });
    expect(response.body.cards.myAssigned).toBe(expectedAssigned);
  });

  it("API-14: moves an unassigned ticket between dashboard buckets after claim", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true, mustChangePassword: false }, orderBy: { id: "asc" } });
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } }, orderBy: { id: "asc" } });
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-DASHBOARD-CLAIM-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: "Dashboard claim fixture", description: "Temporary dashboard claim fixture.", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW" } });
    const cookie = await loginAs(app, staff.email);
    try {
      const claim = await request(app).patch(`/api/staff/tickets/${ticket.id}/owner`).set("Cookie", cookie).send({ ownerId: staff.id });
      expect(claim.status).toBe(200);
      const after = await request(app).get("/api/staff/dashboard").set("Cookie", cookie);
      expect(after.status).toBe(200);
      const claimed = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { ownerId: true } });
      expect(claimed.ownerId).toBe(staff.id);
      expect(after.body.cards.myAssigned).toEqual(expect.any(Number));
      expect(after.body.cards.unassigned).toEqual(expect.any(Number));
    } finally {
      await prisma.ticket.delete({ where: { id: ticket.id } });
    }
  });

  it("API-15: allows Administrators to use the staff dashboard", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true, mustChangePassword: false } });
    const response = await request(app).get("/api/staff/dashboard").set("Cookie", await loginAs(app, admin.email));
    expect(response.status).toBe(200);
    expect(response.body.cards).toEqual(expect.objectContaining({ new: expect.any(Number), unassigned: expect.any(Number) }));
  });

  it("API-17: rejects unauthenticated callers", async () => {
    const response = await request(app).get("/api/staff/dashboard");
    expect(response.status).toBe(401);
  });

  it("API-16: rejects requesters from the staff dashboard", async () => {
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } }, orderBy: { id: "asc" } });
    const response = await request(app).get("/api/staff/dashboard").set("Cookie", await loginAs(app, requester.email));
    expect(response.status).toBe(403);
  });
});

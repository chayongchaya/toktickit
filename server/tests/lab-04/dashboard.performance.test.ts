import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

describe("Lab 4 performance smoke", () => {
  it("PERF-01: returns both dashboards and records elapsed time", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } } });
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } } });
    const staffCookie = await loginAs(app, staff.email);
    const requesterCookie = await loginAs(app, requester.email);
    const staffStart = performance.now();
    const staffResponse = await request(app).get("/api/staff/dashboard").set("Cookie", staffCookie);
    const staffElapsed = performance.now() - staffStart;
    const requesterStart = performance.now();
    const requesterResponse = await request(app).get("/api/tickets/dashboard").set("Cookie", requesterCookie);
    const requesterElapsed = performance.now() - requesterStart;
    expect(staffResponse.status).toBe(200);
    expect(requesterResponse.status).toBe(200);
    expect(staffElapsed).toBeGreaterThanOrEqual(0);
    expect(requesterElapsed).toBeGreaterThanOrEqual(0);
  });

  it("PERF-02: loads a ticket detail containing multiple Actions Taken", async () => {
    const ticket = await prisma.ticket.findFirstOrThrow({ where: { actionsTaken: { some: {} } }, orderBy: { id: "asc" } });
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } } });
    const extraAction = await prisma.actionTaken.create({ data: { ticketId: ticket.id, performedById: staff.id, description: `Performance smoke ${Date.now()}`, result: "Temporary performance fixture", followUpRequired: false } });
    try {
      const response = await request(app).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", await loginAs(app, staff.email));
      expect(response.status).toBe(200);
      expect(response.body.actionsTaken.length).toBeGreaterThan(1);
    } finally {
      await prisma.actionTaken.delete({ where: { id: extraAction.id } });
    }
  });
});

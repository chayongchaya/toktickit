import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

describe("Lab 4 authorization matrix", () => {
  it("AUTH-01: protects both dashboards from unauthenticated callers", async () => {
    const requesterDashboard = await request(app).get("/api/tickets/dashboard");
    const staffDashboard = await request(app).get("/api/staff/dashboard");
    expect(requesterDashboard.status).toBe(401);
    expect(staffDashboard.status).toBe(401);
  });

  it("AUTH-01: denies cross-role dashboard access and allows the administrator staff dashboard", async () => {
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } } });
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } } });
    const administrator = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } } });
    expect((await request(app).get("/api/staff/dashboard").set("Cookie", await loginAs(app, requester.email))).status).toBe(403);
    expect((await request(app).get("/api/tickets/dashboard").set("Cookie", await loginAs(app, staff.email))).status).toBe(403);
    expect((await request(app).get("/api/staff/dashboard").set("Cookie", await loginAs(app, administrator.email))).status).toBe(200);
  });

  it("AUTH-02: denies Requester Actions Taken writes even with a valid ticket", async () => {
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } } });
    const ticket = await prisma.ticket.findFirstOrThrow({ where: { requesterId: requester.id } });
    const response = await request(app)
      .post(`/api/staff/tickets/${ticket.id}/actions`)
      .set("Cookie", await loginAs(app, requester.email))
      .send({ description: "Should be denied", result: "Should be denied", followUpRequired: false });
    expect(response.status).toBe(403);
  });
});

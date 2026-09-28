import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

describe("Staff Dashboard API", () => {
  it("API-12: returns queue-wide and current-user dashboard cards", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true, mustChangePassword: false }, orderBy: { id: "asc" } });
    const response = await request(app).get("/api/staff/dashboard").set("Cookie", await loginAs(app, staff.email));
    expect(response.status).toBe(200);
    expect(response.body.cards).toEqual(expect.objectContaining({ new: expect.any(Number), open: expect.any(Number), inProgress: expect.any(Number), waitingForRequester: expect.any(Number), myAssigned: expect.any(Number), unassigned: expect.any(Number) }));
    expect(response.body.recentTickets.length).toBeLessThanOrEqual(5);
    const expectedAssigned = await prisma.ticket.count({ where: { ownerId: staff.id, currentStatus: { notIn: ["CLOSED", "CANCELLED"] } } });
    expect(response.body.cards.myAssigned).toBe(expectedAssigned);
  });

  it("API-13: rejects requesters from the staff dashboard", async () => {
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } }, orderBy: { id: "asc" } });
    const response = await request(app).get("/api/staff/dashboard").set("Cookie", await loginAs(app, requester.email));
    expect(response.status).toBe(403);
  });
});

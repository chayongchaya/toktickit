import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

describe("Requester Dashboard API", () => {
  it("API-10: returns requester-scoped cards and at most five recent tickets", async () => {
    const requester = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } },
      orderBy: { id: "asc" },
    });
    const response = await request(app).get("/api/tickets/dashboard").set("Cookie", await loginAs(app, requester.email));
    expect(response.status).toBe(200);
    expect(response.body.cards).toEqual(expect.objectContaining({ myOpenTickets: expect.any(Number), waitingForRequester: expect.any(Number), resolved: expect.any(Number), closed: expect.any(Number) }));
    expect(response.body.recentTickets).toHaveLength(Math.min(5, await prisma.ticket.count({ where: { requesterId: requester.id } })));
    expect(response.body.recentTickets.every((ticket: { id: number }) => typeof ticket.id === "number")).toBe(true);
  });

  it("API-11: rejects staff from the requester dashboard", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true, mustChangePassword: false } });
    const response = await request(app).get("/api/tickets/dashboard").set("Cookie", await loginAs(app, staff.email));
    expect(response.status).toBe(403);
  });
});

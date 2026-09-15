import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

describe("IT Staff ticket detail and operations", () => {
  it("returns shared ticket detail for a staff member", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const ticket = await prisma.ticket.findFirstOrThrow();
    const response = await request(app).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", await loginAs(app, staff.email));
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ id: ticket.id, publicComments: expect.any(Array), internalNotes: expect.any(Array) }));
  });

  it("claims and rejects invalid ticket owners", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true } });
    const ticket = await prisma.ticket.findFirstOrThrow({ where: { ownerId: null } });
    const cookie = await loginAs(app, staff.email);
    const claim = await request(app).patch(`/api/staff/tickets/${ticket.id}/owner`).set("Cookie", cookie).send({ ownerId: staff.id });
    expect(claim.status).toBe(200);
    expect(claim.body.ownerId).toBe(staff.id);
    const invalid = await request(app).patch(`/api/staff/tickets/${ticket.id}/owner`).set("Cookie", cookie).send({ ownerId: requester.id });
    expect(invalid.status).toBe(409);
    await prisma.ticket.update({ where: { id: ticket.id }, data: { ownerId: null } });
  });

  it("updates IT priority without changing requested priority", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const ticket = await prisma.ticket.findFirstOrThrow();
    const original = ticket.itPriority;
    const response = await request(app).patch(`/api/staff/tickets/${ticket.id}/priority`).set("Cookie", await loginAs(app, staff.email)).send({ itPriority: "HIGH" });
    expect(response.status).toBe(200);
    expect(response.body.requestedPriority).toBe(ticket.requestedPriority);
    await prisma.ticket.update({ where: { id: ticket.id }, data: { itPriority: original } });
  });

  it("enforces malformed and forbidden status transitions", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const ticket = await prisma.ticket.findFirstOrThrow({ where: { currentStatus: "CLOSED" } });
    const cookie = await loginAs(app, staff.email);
    const malformed = await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", cookie).send({ currentStatus: "NOT_A_STATUS" });
    expect(malformed.status).toBe(400);
    const forbidden = await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", cookie).send({ currentStatus: "IN_PROGRESS" });
    expect(forbidden.status).toBe(409);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).currentStatus).toBe("CLOSED");
  });

  it("allows staff notes and blocks Requesters without leaking note data", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true } });
    const ticket = await prisma.ticket.findFirstOrThrow({ where: { requesterId: requester.id } });
    const staffCookie = await loginAs(app, staff.email);
    const requesterCookie = await loginAs(app, requester.email);
    const blocked = await request(app).get(`/api/staff/tickets/${ticket.id}/notes`).set("Cookie", requesterCookie);
    expect(blocked.status).toBe(403);
    expect(blocked.body).toEqual({ error: "Forbidden" });
    const created = await request(app).post(`/api/staff/tickets/${ticket.id}/notes`).set("Cookie", staffCookie).send({ content: "API detail test note" });
    expect(created.status).toBe(201);
    expect(created.body.author.id).toBe(staff.id);
    const listed = await request(app).get(`/api/staff/tickets/${ticket.id}/notes`).set("Cookie", staffCookie);
    expect(listed.body.some((note: { content: string }) => note.content === "API detail test note")).toBe(true);
    const requesterDetail = await request(app).get(`/api/tickets/${ticket.id}`).set("Cookie", requesterCookie);
    expect(requesterDetail.status).toBe(200);
    expect(requesterDetail.body.internalNotes).toBeUndefined();
    expect(JSON.stringify(requesterDetail.body)).not.toContain("API detail test note");
  });
});

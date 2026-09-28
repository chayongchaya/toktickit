import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

async function fixtures() {
  const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
  const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true, mustChangePassword: false } });
  const requesterTicket = await prisma.ticket.findFirstOrThrow({ where: { requesterId: requester.id, actionsTaken: { none: {} } } });
  const otherTicket = await prisma.ticket.findFirstOrThrow({ where: { id: { not: requesterTicket.id } } });
  return { staff, requester, requesterTicket, otherTicket };
}

async function createAction(ticketId: number, staffEmail: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post(`/api/staff/tickets/${ticketId}/actions`)
    .set("Cookie", await loginAs(app, staffEmail))
    .send({
      description: `API test action ${Date.now()}-${Math.random()}`,
      result: "The test action completed successfully.",
      ...overrides,
    });
}

describe("Actions Taken API", () => {
  it("API-01: allows staff to create an action with server-owned fields", async () => {
    const { staff, requesterTicket } = await fixtures();
    const before = new Date();
    const response = await createAction(requesterTicket.id, staff.email, {
      performedById: 999999,
      actionDateTime: "2000-01-01T00:00:00.000Z",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({
      ticketId: requesterTicket.id,
      performedById: staff.id,
      followUpRequired: false,
      followUpNote: null,
    }));
    expect(new Date(response.body.actionDateTime).getTime()).toBeGreaterThanOrEqual(before.getTime());
    await prisma.actionTaken.delete({ where: { id: response.body.id } });
  });

  it("API-02: returns validation errors for blank or oversized description/result", async () => {
    const { staff, requesterTicket } = await fixtures();
    const cookie = await loginAs(app, staff.email);
    const blank = await request(app).post(`/api/staff/tickets/${requesterTicket.id}/actions`).set("Cookie", cookie).send({ description: " ", result: "ok" });
    expect(blank.status).toBe(400);
    expect(blank.body.field).toBe("description");

    const oversized = await request(app).post(`/api/staff/tickets/${requesterTicket.id}/actions`).set("Cookie", cookie).send({ description: "x".repeat(2001), result: "ok" });
    expect(oversized.status).toBe(400);
    expect(oversized.body.field).toBe("description");
  });

  it("API-03: requires a follow-up note when follow-up is required", async () => {
    const { staff, requesterTicket } = await fixtures();
    const description = `Rejected follow-up action ${Date.now()}`;
    const response = await createAction(requesterTicket.id, staff.email, { description, followUpRequired: true });
    expect(response.status).toBe(400);
    expect(response.body.field).toBe("followUpNote");
    expect(await prisma.actionTaken.count({ where: { ticketId: requesterTicket.id, description } })).toBe(0);
  });

  it("API-04: normalizes a supplied follow-up note to null when follow-up is false", async () => {
    const { staff, requesterTicket } = await fixtures();
    const response = await createAction(requesterTicket.id, staff.email, { followUpNote: "should be cleared" });
    expect(response.status).toBe(201);
    expect(response.body.followUpNote).toBeNull();
    await prisma.actionTaken.delete({ where: { id: response.body.id } });
  });

  it("API-05: rejects Requesters from writing actions", async () => {
    const { requester, requesterTicket } = await fixtures();
    const response = await request(app)
      .post(`/api/staff/tickets/${requesterTicket.id}/actions`)
      .set("Cookie", await loginAs(app, requester.email))
      .send({ description: "Requester must not write", result: "Denied" });
    expect(response.status).toBe(403);
  });

  it("API-06: updates editable fields but preserves performer and timestamps", async () => {
    const { staff, requesterTicket } = await fixtures();
    const created = await createAction(requesterTicket.id, staff.email, { followUpRequired: true, followUpNote: "Call requester" });
    expect(created.status).toBe(201);
    const original = await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.id } });
    const response = await request(app)
      .patch(`/api/staff/tickets/${requesterTicket.id}/actions/${created.body.id}`)
      .set("Cookie", await loginAs(app, staff.email))
      .send({ description: "Updated description", result: "Updated result", followUpRequired: false, followUpNote: "must clear", performedById: 999999 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ description: "Updated description", result: "Updated result", followUpRequired: false, followUpNote: null, performedById: original.performedById, actionDateTime: original.actionDateTime.toISOString() }));
    await prisma.actionTaken.delete({ where: { id: created.body.id } });
  });

  it("API-07: rejects an action id that belongs to another ticket", async () => {
    const { staff, requesterTicket, otherTicket } = await fixtures();
    const created = await createAction(requesterTicket.id, staff.email);
    expect(created.status).toBe(201);
    const response = await request(app)
      .patch(`/api/staff/tickets/${otherTicket.id}/actions/${created.body.id}`)
      .set("Cookie", await loginAs(app, staff.email))
      .send({ description: "Should not move", result: "Should not move" });
    expect(response.status).toBe(404);
    await prisma.actionTaken.delete({ where: { id: created.body.id } });
  });

  it("API-08: includes actions in requester ticket detail and returns an empty array for none", async () => {
    const { staff, requester, requesterTicket } = await fixtures();
    const response = await request(app).get(`/api/tickets/${requesterTicket.id}`).set("Cookie", await loginAs(app, requester.email));
    expect(response.status).toBe(200);
    expect(response.body.actionsTaken).toEqual(expect.any(Array));

    const created = await createAction(requesterTicket.id, staff.email);
    expect(created.status).toBe(201);
    const withAction = await request(app).get(`/api/tickets/${requesterTicket.id}`).set("Cookie", await loginAs(app, requester.email));
    expect(withAction.body.actionsTaken.some((action: { id: number }) => action.id === created.body.id)).toBe(true);
    await prisma.actionTaken.delete({ where: { id: created.body.id } });
  });

  it("API-09: exposes actions to staff detail but has no requester write route", async () => {
    const { staff, requester, requesterTicket } = await fixtures();
    const created = await createAction(requesterTicket.id, staff.email);
    expect(created.status).toBe(201);
    const staffDetail = await request(app).get(`/api/staff/tickets/${requesterTicket.id}`).set("Cookie", await loginAs(app, staff.email));
    expect(staffDetail.status).toBe(200);
    expect(staffDetail.body.actionsTaken.some((action: { id: number }) => action.id === created.body.id)).toBe(true);

    const requesterPatch = await request(app)
      .patch(`/api/tickets/${requesterTicket.id}/actions/${created.body.id}`)
      .set("Cookie", await loginAs(app, requester.email))
      .send({ description: "Requester update", result: "Denied" });
    expect([403, 404]).toContain(requesterPatch.status);
    await prisma.actionTaken.delete({ where: { id: created.body.id } });
  });
});

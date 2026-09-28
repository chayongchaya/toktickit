import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { TICKET_STATUSES, TICKET_TRANSITIONS } from "../../src/lib/ticketTransitions.js";
import { loginAs, SEED_PASSWORD } from "../helpers/auth.js";

const prisma = getPrisma();
const fixtureTicketIds = new Set<number>();
const fixtureRequesterIds = new Set<number>();

async function createFixture(status: string) {
  const requester = await prisma.user.create({
    data: {
      name: `Workflow Requester ${Date.now()}`,
      email: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
      passwordHash: await bcrypt.hash(SEED_PASSWORD, 10),
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
    },
  });
  fixtureRequesterIds.add(requester.id);
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const ticket = await prisma.ticket.create({ data: {
    ticketNumber: `TKT-WORKFLOW-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    requesterId: requester.id, categoryId: category.id, relatedSystemId: relatedSystem.id,
    summary: "Workflow regression fixture", description: "Temporary ticket for Lab 4 workflow regression tests.",
    requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: status,
  } });
  fixtureTicketIds.add(ticket.id);
  return { ticket, requester };
}

afterEach(async () => {
  const ids = [...fixtureTicketIds];
  if (ids.length) {
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ids } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
  }
  fixtureTicketIds.clear();
  await prisma.user.deleteMany({ where: { id: { in: [...fixtureRequesterIds] } } });
  fixtureRequesterIds.clear();
});

describe("Lab 4 ticket workflow regression", () => {
  it("WORKFLOW-01: requester resolved flag is advisory and preserves status", async () => {
    const { ticket, requester } = await createFixture("IN_PROGRESS");
    const response = await request(app).patch(`/api/tickets/${ticket.id}/resolved-flag`)
      .set("Cookie", await loginAs(app, requester.email)).send({ problemAppearsResolved: true });
    expect(response.status).toBe(200);
    expect(response.body.currentStatus).toBe("IN_PROGRESS");
    expect(response.body.problemAppearsResolved).toBe(true);
  });

  it("WORKFLOW-02: staff formally resolves a ticket after an action is recorded", async () => {
    const { ticket } = await createFixture("IN_PROGRESS");
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: "kevin.patel@tiktockit.com" } });
    const cookie = await loginAs(app, staff.email);
    const action = await request(app).post(`/api/staff/tickets/${ticket.id}/actions`).set("Cookie", cookie).send({ description: "Completed workflow action", result: "Resolution is ready for review", followUpRequired: false });
    expect(action.status).toBe(201);
    const response = await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", cookie).send({ currentStatus: "RESOLVED" });
    expect(response.status).toBe(200);
    expect(response.body.currentStatus).toBe("RESOLVED");
  });

  it("WORKFLOW-03: requester cannot change status through the staff endpoint", async () => {
    const { ticket, requester } = await createFixture("IN_PROGRESS");
    const response = await request(app).patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Cookie", await loginAs(app, requester.email)).send({ currentStatus: "RESOLVED" });
    expect(response.status).toBe(403);
  });

  it("CONC-01: rejects a stale second status update without changing stored status", async () => {
    const { ticket } = await createFixture("IN_PROGRESS");
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: "kevin.patel@tiktockit.com" } });
    const cookie = await loginAs(app, staff.email);
    const first = await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", cookie).send({ currentStatus: "RESOLVED" });
    expect(first.status).toBe(200);
    const stale = await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", cookie).send({ currentStatus: "RESOLVED" });
    expect(stale.status).toBe(409);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).currentStatus).toBe("RESOLVED");
  });

  it("WORKFLOW-04: rejects every disallowed transition from all eight statuses", async () => {
    for (const status of TICKET_STATUSES) {
      const { ticket } = await createFixture(status);
      const staff = await prisma.user.findUniqueOrThrow({ where: { email: "kevin.patel@tiktockit.com" } });
      const cookie = await loginAs(app, staff.email);
      const disallowed = TICKET_STATUSES.filter((next) => next !== status && !(TICKET_TRANSITIONS[status] ?? []).includes(next));
      for (const next of disallowed) {
        const response = await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", cookie).send({ currentStatus: next });
        expect(response.status, `${status} -> ${next}`).toBe(409);
        expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).currentStatus).toBe(status);
      }
    }
  });

  it("WORKFLOW-05/06: staff detail preserves legacy arrays and empty actions", async () => {
    const { ticket } = await createFixture("NEW");
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: "kevin.patel@tiktockit.com" } });
    const response = await request(app).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", await loginAs(app, staff.email));
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ attachments: expect.any(Array), publicComments: expect.any(Array), internalNotes: expect.any(Array), actionsTaken: [] }));
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

// API-08 (tests.md): an inactive Development Requester's id sent directly
// to the API (bypassing the UI selector) must still be rejected for every
// write action, per BR-04 and AC-11 in specification.md. This file
// consolidates the inactive-requester scenarios into one place, even
// though a couple of the individual assertions are also exercised inline
// inside tickets.create.test.ts and attachments.api.test.ts.
describe("Inactive Development Requester (BR-04 / AC-11)", () => {
  let inactiveRequesterId: number;
  let activeCategoryId: number;
  let activeSystemId: number;

  beforeAll(async () => {
    let inactive = await prisma.requesterUser.findFirst({
      where: { isActive: false },
    });
    if (!inactive) {
      inactive = await prisma.requesterUser.create({
        data: {
          name: "Dedicated Inactive Test User",
          email: `inactive-dedicated-${Date.now()}@kmutt.ac.th`,
          isActive: false,
        },
      });
    }
    inactiveRequesterId = inactive.id;

    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    activeCategoryId = category!.id;
    activeSystemId = system!.id;
  });

  it("BR-04: is excluded from GET /api/requesters (the Development Requester selector list)", async () => {
    const res = await request(app).get("/api/requesters");

    expect(res.status).toBe(200);
    const ids = res.body.map((r: { id: number }) => r.id);
    expect(ids).not.toContain(inactiveRequesterId);
  });

  it("AC-11: POST /api/tickets is rejected with 403 for an inactive requester id", async () => {
    const res = await request(app).post("/api/tickets").send({
      requesterId: inactiveRequesterId,
      categoryId: activeCategoryId,
      relatedSystemId: activeSystemId,
      requestedPriority: "MEDIUM",
      summary: "Inactive requester direct API test",
      description: "Sent directly to the API, bypassing the UI selector entirely.",
    });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("AC-11: POST /api/tickets/:id/attachments is rejected with 403 for an inactive requester id", async () => {
    // Create a valid ticket under an active requester first, then attempt
    // to attach a file to it using the inactive requester's id.
    const activeRequester = await prisma.requesterUser.findFirst({
      where: { isActive: true },
    });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}-INACT`,
        requesterId: activeRequester!.id,
        categoryId: activeCategoryId,
        relatedSystemId: activeSystemId,
        requestedPriority: "LOW",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        summary: "Ticket used for inactive-requester upload test",
        description: "Set up to verify an inactive requester cannot upload to it.",
      },
    });

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("x-requester-id", inactiveRequesterId.toString())
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: "inactive-upload-attempt.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 403 (not 404) so the caller learns the id exists but is inactive, distinct from an unknown id", async () => {
    const unknownRes = await request(app).post("/api/tickets").send({
      requesterId: 999_999_999,
      categoryId: activeCategoryId,
      relatedSystemId: activeSystemId,
      requestedPriority: "MEDIUM",
      summary: "Unknown requester id test",
      description: "This requesterId does not exist in the database at all.",
    });

    expect(unknownRes.status).toBe(404);

    const inactiveRes = await request(app).post("/api/tickets").send({
      requesterId: inactiveRequesterId,
      categoryId: activeCategoryId,
      relatedSystemId: activeSystemId,
      requestedPriority: "MEDIUM",
      summary: "Inactive vs missing requester test",
      description: "This requesterId exists but belongs to an inactive requester.",
    });

    expect(inactiveRes.status).toBe(403);
  });
});

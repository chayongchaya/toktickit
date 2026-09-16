import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

describe("Cross-cutting Authorization (tests.md API-08 to API-13)", () => {
  it("API-08 (AC-25): a Requester cannot call staff or admin endpoints", async () => {
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } } });
    const cookie = await loginAs(app, requester.email);
    expect((await request(app).get("/api/staff/tickets").set("Cookie", cookie)).status).toBe(403);
    expect((await request(app).get("/api/admin/users").set("Cookie", cookie)).status).toBe(403);
  });

  it("API-09 (AC-26): IT Staff cannot call admin endpoints", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const cookie = await loginAs(app, staff.email);
    expect((await request(app).get("/api/admin/users").set("Cookie", cookie)).status).toBe(403);
  });

  it("API-10 (AC-03): a client-supplied requesterId in the create-ticket body is ignored; the authenticated identity is used instead", async () => {
    const [me, someoneElse] = await prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER", mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } },
      take: 2,
    });
    const cookie = await loginAs(app, me.email);
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const res = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({
        // Attempting to impersonate someoneElse via the body -- BR-03 says
        // this must be silently ignored, not merely rejected.
        requesterId: someoneElse.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "MEDIUM",
        summary: `AC-03 impersonation test ${Date.now()}`,
        description: "This ticket must be owned by the session user, not the spoofed id.",
      });

    expect(res.status).toBe(201);
    expect(res.body.requesterId).toBe(me.id);
    expect(res.body.requesterId).not.toBe(someoneElse.id);
  });

  it("API-10 (AC-03): a client-supplied authorId on a Public Comment is ignored; the authenticated identity is used instead", async () => {
    const [me, someoneElse] = await prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER", mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } },
      take: 2,
    });
    const cookie = await loginAs(app, me.email);
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}-AC03C`,
        requesterId: me.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "NEW",
        summary: "AC-03 comment spoof test",
        description: "Testing that authorId cannot be spoofed via the request body.",
      },
    });

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set("Cookie", cookie)
      .send({ content: "Trying to post as someone else", authorId: someoneElse.id });

    expect(res.status).toBe(201);
    expect(res.body.author.id).toBe(me.id);
    expect(res.body.author.id).not.toBe(someoneElse.id);
  });

  it("API-11 (AC-04, BR-22): a Requester cannot access Internal Notes and receives no note data", async () => {
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } } });
    const ticket = await prisma.ticket.findFirstOrThrow();
    const cookie = await loginAs(app, requester.email);
    const getResponse = await request(app).get(`/api/staff/tickets/${ticket.id}/notes`).set("Cookie", cookie);
    const postResponse = await request(app).post(`/api/staff/tickets/${ticket.id}/notes`).set("Cookie", cookie).send({ content: "should be blocked" });
    expect(getResponse.status).toBe(403);
    expect(postResponse.status).toBe(403);
    expect(getResponse.body).toEqual({ error: "Forbidden" });
    expect(postResponse.body).toEqual({ error: "Forbidden" });
    expect(JSON.stringify(getResponse.body)).not.toContain("note");
    expect(JSON.stringify(postResponse.body)).not.toContain("note");
  });

  it("API-12 (AC-28): a Requester requesting an attachment on a ticket they don't own gets 404, not 403 (existence-hiding)", async () => {
    const [owner, other] = await prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER", mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } },
      take: 2,
    });
    const otherCookie = await loginAs(app, other.email);
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}-AC28`,
        requesterId: owner.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "NEW",
        summary: "AC-28 existence-hiding test",
        description: "Testing that a non-owned ticket's attachment upload returns 404.",
      },
    });

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("Cookie", otherCookie)
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: "spoof.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
  });

  it("API-13 (FR-07): the same 'not your ticket' failure reason returns an identical status code across three different endpoints", async () => {
    const [owner, other] = await prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER", mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } },
      take: 2,
    });
    const otherCookie = await loginAs(app, other.email);
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}-AC13`,
        requesterId: owner.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "NEW",
        summary: "API-13 cross-endpoint consistency test",
        description: "Verifying GET detail, resolved-flag, and comments all agree on 404.",
      },
    });

    const detailRes = await request(app).get(`/api/tickets/${ticket.id}`).set("Cookie", otherCookie);
    const resolvedFlagRes = await request(app)
      .patch(`/api/tickets/${ticket.id}/resolved-flag`)
      .set("Cookie", otherCookie)
      .send({ problemAppearsResolved: true });
    const commentsRes = await request(app)
      .get(`/api/tickets/${ticket.id}/comments`)
      .set("Cookie", otherCookie);

    expect(detailRes.status).toBe(404);
    expect(resolvedFlagRes.status).toBe(404);
    expect(commentsRes.status).toBe(404);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { getPrisma } from "../../src/prisma";

const prisma = getPrisma();

describe("My Tickets API (Filtering, Sorting, Pagination & Isolation)", () => {
  let userAId: number;
  let userBId: number;

  beforeEach(async () => {
    const users = await prisma.requesterUser.findMany({
      where: { isActive: true },
      take: 2,
    });
    userAId = users[0].id;
    userBId = users[1].id;

    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const timestamp = Date.now() + "-" + Math.floor(Math.random() * 10000);

    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${timestamp}-001`,
        requesterId: userAId,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "NEW",
        summary: "User A Laptop issue",
        description: "Detail description 1",
      },
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${timestamp}-002`,
        requesterId: userAId,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        summary: "User A Network failure",
        description: "Detail description 2",
      },
    });

    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${timestamp}-003`,
        requesterId: userBId,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        summary: "User B VPN trouble",
        description: "Detail description 3",
      },
    });
  });

  it("should return tickets belonging only to the authenticated requester", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("x-requester-id", userAId.toString());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    res.body.data.forEach((t: any) => {
      expect(t.requesterId).toBe(userAId);
    });
  });

  it("should correctly search and filter tickets by query parameters", async () => {
    const res = await request(app)
      .get("/api/tickets?search=Network")
      .set("x-requester-id", userAId.toString());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].summary).toContain("Network");
  });
});
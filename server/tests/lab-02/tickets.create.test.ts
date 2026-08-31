import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { getPrisma } from "../../src/prisma";

const prisma = getPrisma();

describe("POST /api/tickets & GET /api/systems", () => {
  it("GET /api/systems should return 200 and active systems", async () => {
    const res = await request(app).get("/api/related-systems");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /api/tickets should return 400 when summary or description is missing", async () => {
    const res = await request(app).post("/api/tickets").send({
      requesterId: 1,
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/tickets should create ticket with status NEW", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const payload = {
      requesterId: requester!.id,
      categoryId: category!.id,
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
      summary: "Cannot access internal VPN",
      description: "Getting timeout error when trying to connect to university VPN network.",
    };

    const res = await request(app).post("/api/tickets").send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("ticketNumber");
    expect(res.body.currentStatus).toBe("NEW");
  });

  it("GET /api/tickets/:id should return ticket details by ID for the owning requester", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const created = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}-DTL`,
        requesterId: requester!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "NEW",
        summary: "Detail Test Ticket",
        description: "Detail description test",
      },
    });

    const res = await request(app).get(
      `/api/tickets/${created.id}?requesterId=${created.requesterId}`
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", created.id);
    expect(res.body).toHaveProperty("summary");
  });

  it("GET /api/tickets/:id should return 400 when requesterId is missing", async () => {
    const existingTicket = await prisma.ticket.findFirst();
    if (existingTicket) {
      const res = await request(app).get(`/api/tickets/${existingTicket.id}`);
      expect(res.status).toBe(400);
    }
  });

  it("GET /api/tickets/:id should return 403 when requester does not own the ticket", async () => {
    const requesters = await prisma.requesterUser.findMany({ where: { isActive: true }, take: 2 });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const owner = requesters[0];
    const other = requesters[1];

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}-OWN`,
        requesterId: owner.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "NEW",
        summary: "Forbidden Test Ticket",
        description: "Forbidden description test",
      },
    });

    const res = await request(app).get(
      `/api/tickets/${ticket.id}?requesterId=${other.id}`
    );
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/tickets/:id should return 404 for non-existent ticket ID", async () => {
    const res = await request(app).get("/api/tickets/999999?requesterId=1");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});
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

  it("POST /api/tickets should return 400 for an invalid requestedPriority value", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app).post("/api/tickets").send({
      requesterId: requester!.id,
      categoryId: category!.id,
      relatedSystemId: system!.id,
      requestedPriority: "URGENT", // not a valid Priority enum value
      summary: "Invalid priority test",
      description: "Sending an unsupported priority value to the API.",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/tickets should return 400 (not 500) for a non-numeric categoryId", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app).post("/api/tickets").send({
      requesterId: requester!.id,
      categoryId: "abc",
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
      summary: "Non-numeric category ID test",
      description: "Sending a non-numeric categoryId must not crash into a 500.",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/tickets should return 400 for a non-existent categoryId", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app).post("/api/tickets").send({
      requesterId: requester!.id,
      categoryId: 999999,
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
      summary: "Invalid category test",
      description: "Sending a categoryId that does not exist.",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/tickets should return 400 for a non-existent relatedSystemId", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst();

    const res = await request(app).post("/api/tickets").send({
      requesterId: requester!.id,
      categoryId: category!.id,
      relatedSystemId: 999999,
      requestedPriority: "MEDIUM",
      summary: "Invalid related system test",
      description: "Sending a relatedSystemId that does not exist.",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/tickets should return 403 for an inactive Development Requester (AC-11)", async () => {
    let inactive = await prisma.requesterUser.findFirst({ where: { isActive: false } });
    if (!inactive) {
      inactive = await prisma.requesterUser.create({
        data: {
          name: "Create Test Inactive User",
          email: `inactive-create-${Date.now()}@kmutt.ac.th`,
          isActive: false,
        },
      });
    }
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app).post("/api/tickets").send({
      requesterId: inactive.id,
      categoryId: category!.id,
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
      summary: "Inactive requester test",
      description: "An inactive requester must not be able to create a ticket.",
    });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/tickets should return 404 for a requesterId that does not exist at all", async () => {
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app).post("/api/tickets").send({
      requesterId: 999999999,
      categoryId: category!.id,
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
      summary: "Non-existent requester test",
      description: "A requesterId that has no matching row must be rejected.",
    });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/tickets should reject an immediate resubmission of the same ticket with 409", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const payload = {
      requesterId: requester!.id,
      categoryId: category!.id,
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
      summary: `Duplicate submission test ${Date.now()}`,
      description: "Submitting this exact same ticket twice in a row should be blocked.",
    };

    const first = await request(app).post("/api/tickets").send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/tickets").send(payload);
    expect(second.status).toBe(409);
    expect(second.body).toHaveProperty("error");
  });

  it("POST /api/tickets should default itPriority to MEDIUM independently of requestedPriority", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app).post("/api/tickets").send({
      requesterId: requester!.id,
      categoryId: category!.id,
      relatedSystemId: system!.id,
      requestedPriority: "HIGH",
      summary: `itPriority default test ${Date.now()}`,
      description: "Requested priority is HIGH; IT priority must still default to MEDIUM.",
    });

    expect(res.status).toBe(201);
    expect(res.body.requestedPriority).toBe("HIGH");
    expect(res.body.itPriority).toBe("MEDIUM");
  });

  it("GET /api/tickets should filter by itPriority", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}-ITP`,
        requesterId: requester!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "HIGH",
        currentStatus: "NEW",
        summary: "IT Priority filter test",
        description: "Ticket created to verify itPriority query filtering.",
      },
    });

    const res = await request(app)
      .get(`/api/tickets?itPriority=HIGH&requesterId=${requester!.id}`);

    expect(res.status).toBe(200);
    const tickets = res.body.data ?? res.body.tickets;
    expect(Array.isArray(tickets)).toBe(true);
    for (const t of tickets) {
      expect(t.itPriority).toBe("HIGH");
    }
  });
});
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("POST /api/tickets & GET /api/systems", () => {
  it("GET /api/systems should return 200 and active systems", async () => {
    const res = await request(app).get("/api/systems");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((s: { isActive: boolean }) => {
      expect(s.isActive).toBe(true);
    });
  });

  it("POST /api/tickets should return 400 when summary or description is missing", async () => {
    const res = await request(app).post("/api/tickets").send({
      categoryId: 1,
      requesterId: 1,
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/tickets should create ticket with status NEW", async () => {
    const payload = {
      summary: "Cannot access VPN network",
      description: "Getting timeout error when connecting to KMUTT VPN",
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "HIGH",
      requesterId: 1,
    };

    const res = await request(app).post("/api/tickets").send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("ticketNumber");
    expect(res.body.summary).toBe(payload.summary);
    expect(res.body.currentStatus).toBe("NEW");
    expect(res.body.requestedPriority).toBe("HIGH");
  });
  it("GET /api/tickets/:id should return ticket details by ID", async () => {
  // ดึงตั๋วใบแรกที่สร้างไว้
  const prisma = (await import("../../src/prisma.js")).getPrisma();
  const existingTicket = await prisma.ticket.findFirst();

  if (existingTicket) {
    const res = await request(app).get(`/api/tickets/${existingTicket.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", existingTicket.id);
    expect(res.body).toHaveProperty("summary");
    expect(res.body).toHaveProperty("category");
    expect(res.body).toHaveProperty("relatedSystem");
    expect(res.body).toHaveProperty("requester");
  }
});

it("GET /api/tickets/:id should return 404 for non-existent ticket ID", async () => {
  const res = await request(app).get("/api/tickets/999999");
  expect(res.status).toBe(404);
  expect(res.body).toHaveProperty("error");
});
});
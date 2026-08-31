import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";

const prisma = getPrisma();

describe("GET /api/tickets/:id - Requester Ticket Detail", () => {
  let userA: any;
  let userB: any;
  let category: any;
  let system: any;
  let ticketA: any;

  beforeEach(async () => {
    // ดึง User, Category, System จาก Seeded Data ที่มีอยู่ในระบบ
    const users = await prisma.requesterUser.findMany({
      where: { isActive: true },
      take: 2,
    });
    userA = users[0];
    userB = users[1];

    category = await prisma.category.findFirst({ where: { isActive: true } });
    system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // สร้าง Ticket เฉพาะของ User A สำหรับทดสอบ
    const uniqueNum = `TKT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    ticketA = await prisma.ticket.create({
      data: {
        ticketNumber: uniqueNum,
        summary: "Detail Test Ticket",
        description: "Testing ticket detail endpoint",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
        requesterId: userA.id,
        categoryId: category.id,
        relatedSystemId: system.id,
      },
    });
  });

  it("should return ticket detail successfully when accessed by the owner", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketA.id}?requesterId=${userA.id}`)
      .set("x-requester-id", userA.id.toString());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", ticketA.id);
    expect(res.body).toHaveProperty("summary", "Detail Test Ticket");
  });

  it("should reject access when another requester attempts to view the ticket (Ownership Check)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketA.id}?requesterId=${userB.id}`)
      .set("x-requester-id", userB.id.toString());

    expect([403, 404]).toContain(res.status);
  });

  it("should return 404 for a non-existent ticket ID", async () => {
    const res = await request(app)
      .get(`/api/tickets/999999?requesterId=${userA.id}`)
      .set("x-requester-id", userA.id.toString());

    expect(res.status).toBe(404);
  });
});
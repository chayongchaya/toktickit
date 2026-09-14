import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

describe("GET /api/tickets/:id - Requester Ticket Detail", () => {
  let userA: any;
  let userB: any;
  let category: any;
  let system: any;
  let ticketA: any;
  let cookieA: string;
  let cookieB: string;

  beforeEach(async () => {
    // ดึง User, Category, System จาก Seeded Data ที่มีอยู่ในระบบ
    // Lab 3: RequesterUser -> User; role filter needed since User now also
    // holds IT Staff/Administrator rows.
    const users = await prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER" },
      take: 2,
    });
    userA = users[0];
    userB = users[1];
    cookieA = await loginAs(app, userA.email);
    cookieB = await loginAs(app, userB.email);

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
    const res = await request(app).get(`/api/tickets/${ticketA.id}`).set("Cookie", cookieA);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", ticketA.id);
    expect(res.body).toHaveProperty("summary", "Detail Test Ticket");
  });

  it("should reject access when another requester attempts to view the ticket (Ownership Check)", async () => {
    // Lab 3 (FR-07/AC-28): this is now always 404, not 403 -- a ticket that
    // exists but isn't yours must be indistinguishable from one that
    // doesn't exist at all.
    const res = await request(app).get(`/api/tickets/${ticketA.id}`).set("Cookie", cookieB);

    expect(res.status).toBe(404);
  });

  it("should return 404 for a non-existent ticket ID", async () => {
    const res = await request(app).get(`/api/tickets/999999`).set("Cookie", cookieA);

    expect(res.status).toBe(404);
  });
});

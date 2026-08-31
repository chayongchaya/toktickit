import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { getPrisma } from "../../src/prisma";

const prisma = getPrisma();

describe("Attachment Lifecycle & Ownership API", () => {
  let userAId: number;
  let userBId: number;
  let userATicketId: number;
  let testAttachmentId: number;

  beforeEach(async () => {
    const users = await prisma.requesterUser.findMany({
      where: { isActive: true },
      take: 2,
    });
    userAId = users[0].id;
    userBId = users[1].id;

    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const uniqueNum = `TKT-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: uniqueNum,
        requesterId: userAId,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        summary: "Attachment Test Ticket",
        description: "Testing attachment upload, soft remove, and ownership.",
      },
    });
    userATicketId = ticket.id;

    const attachment = await prisma.attachment.create({
      data: {
        ticketId: userATicketId,
        fileName: "sample_log.pdf",
        storagePath: "uploads/sample_log.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        isRemoved: false,
      },
    });
    testAttachmentId = attachment.id;
  });

  it("should return 403 when User B tries to soft-remove User A's attachment", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${testAttachmentId}`)
      .set("x-requester-id", userBId.toString())
      .send({ removalReason: "Attempt unauthorized delete" });

    expect(res.status).toBe(403);
  });

  it("should return 400 when soft-removing without a removalReason", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${testAttachmentId}`)
      .set("x-requester-id", userAId.toString())
      .send({});

    expect(res.status).toBe(400);
  });

  it("should allow the owner to soft-remove attachment with a valid reason", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${testAttachmentId}`)
      .set("x-requester-id", userAId.toString())
      .send({ removalReason: "Uploaded outdated document" });

    expect(res.status).toBe(200);
    expect(res.body.isRemoved).toBe(true);
    expect(res.body.removalReason).toBe("Uploaded outdated document");
  });

  it("should return 404 when attempting to download a soft-removed attachment", async () => {
    await prisma.attachment.update({
      where: { id: testAttachmentId },
      data: { isRemoved: true, removalReason: "Deleted already" },
    });

    const res = await request(app)
      .get(`/api/attachments/${testAttachmentId}/download`)
      .set("x-requester-id", userAId.toString());

    expect(res.status).toBe(404);
  });
});
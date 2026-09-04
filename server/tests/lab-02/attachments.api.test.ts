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
describe("POST /api/tickets/:id/attachments (real upload path)", () => {
  let activeRequesterId: number;
  let inactiveRequesterId: number;
  let otherActiveRequesterId: number;
  let ticketId: number;

  beforeEach(async () => {
    const [active, other] = await prisma.requesterUser.findMany({
      where: { isActive: true },
      take: 2,
    });
    activeRequesterId = active.id;
    otherActiveRequesterId = other.id;

    let inactive = await prisma.requesterUser.findFirst({ where: { isActive: false } });
    if (!inactive) {
      inactive = await prisma.requesterUser.create({
        data: {
          name: "Upload Test Inactive User",
          email: `inactive-upload-${Date.now()}@kmutt.ac.th`,
          isActive: false,
        },
      });
    }
    inactiveRequesterId = inactive.id;

    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}-${Math.floor(Math.random() * 100000)}-UPL`,
        requesterId: activeRequesterId,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        summary: "Upload Endpoint Test Ticket",
        description: "Testing the real multipart upload endpoint.",
      },
    });
    ticketId = ticket.id;
  });

  it("should store the requester's original filename separately from the generated storage filename", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", activeRequesterId.toString())
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: "my battery diagnostic report.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("originalFileName", "my battery diagnostic report.pdf");
    // The generated storage filename must exist and must NOT be the same
    // as the original filename (it should be a unique, generated name).
    expect(res.body.fileName).toBeTruthy();
    expect(res.body.fileName).not.toBe("my battery diagnostic report.pdf");
  });

  it("should reject upload with 400 for a disallowed file type", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", activeRequesterId.toString())
      .attach("file", Buffer.from("not-a-real-exe"), {
        filename: "malware.exe",
        contentType: "application/octet-stream",
      });

    expect(res.status).toBe(400);
  });

  it("should return 403 and reject upload for an inactive Development Requester (AC-11)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", inactiveRequesterId.toString())
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: "notes.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(403);
  });

  it("should return 404 for a requesterId that does not exist at all", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", "999999999")
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: "notes.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(404);
  });

  it("should return 403 when a different active requester tries to upload to a ticket they do not own", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", otherActiveRequesterId.toString())
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: "notes.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(403);
  });

  it("should download an active attachment using the original filename in Content-Disposition", async () => {
    const upload = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", activeRequesterId.toString())
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: "screenshot error.png",
        contentType: "image/png",
      });

    expect(upload.status).toBe(201);
    const attachmentId = upload.body.id;

    const download = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("x-requester-id", activeRequesterId.toString());

    expect(download.status).toBe(200);
    expect(download.headers["content-disposition"]).toContain("screenshot error.png");
  });

  it("API-06b: preserves Thai characters and spaces in originalFileName", async () => {
    const originalFileName = "รายงาน ปัญหา_lab2.pdf";

    const upload = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", activeRequesterId.toString())
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: originalFileName,
        contentType: "application/pdf",
      });

    expect(upload.status).toBe(201);
    expect(upload.body.originalFileName).toBe(originalFileName);

    const metadata = await request(app)
      .get(`/api/attachments/${upload.body.id}`)
      .set("x-requester-id", activeRequesterId.toString());

    expect(metadata.status).toBe(200);
    expect(metadata.body.originalFileName ?? metadata.body.fileName)
      .toBe(originalFileName);
  });
});

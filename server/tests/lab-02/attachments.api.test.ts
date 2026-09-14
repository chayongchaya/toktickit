import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

describe("Attachment Lifecycle & Ownership API", () => {
  let userAId: number;
  let userBId: number;
  let userATicketId: number;
  let testAttachmentId: number;
  let cookieA: string;
  let cookieB: string;

  beforeEach(async () => {
    // Lab 3: RequesterUser -> User; role filter needed since User now also
    // holds IT Staff/Administrator rows.
    const users = await prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER" },
      take: 2,
    });
    userAId = users[0].id;
    userBId = users[1].id;
    cookieA = await loginAs(app, users[0].email);
    cookieB = await loginAs(app, users[1].email);

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

  it("should return 404 when User B tries to soft-remove User A's attachment (Lab 3: existence-hiding, not 403)", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${testAttachmentId}`)
      .set("Cookie", cookieB)
      .send({ removalReason: "Attempt unauthorized delete" });

    expect(res.status).toBe(404);
  });

  it("should return 400 when soft-removing without a removalReason", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${testAttachmentId}`)
      .set("Cookie", cookieA)
      .send({});

    expect(res.status).toBe(400);
  });

  it("should allow the owner to soft-remove attachment with a valid reason", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${testAttachmentId}`)
      .set("Cookie", cookieA)
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
      .set("Cookie", cookieA);

    expect(res.status).toBe(404);
  });
});

describe("POST /api/tickets/:id/attachments (real upload path)", () => {
  let activeRequesterId: number;
  let otherActiveRequesterId: number;
  let ticketId: number;
  let cookieActive: string;
  let cookieOther: string;

  beforeEach(async () => {
    const [active, other] = await prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER" },
      take: 2,
    });
    activeRequesterId = active.id;
    otherActiveRequesterId = other.id;
    cookieActive = await loginAs(app, active.email);
    cookieOther = await loginAs(app, other.email);

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
      .set("Cookie", cookieActive)
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
      .set("Cookie", cookieActive)
      .attach("file", Buffer.from("not-a-real-exe"), {
        filename: "malware.exe",
        contentType: "application/octet-stream",
      });

    expect(res.status).toBe(400);
  });

  // Lab 3: there is no longer any way for a client to "upload as" an
  // arbitrary requesterId at all -- identity comes exclusively from the
  // session cookie (BR-03). The old "inactive/nonexistent requesterId"
  // tests that lived here are structurally obsolete under session auth and
  // have been replaced with the session-equivalent scenario: an account
  // that goes inactive AFTER it already has a live session (AC-27).
  it("AC-27: blocks upload once the account is deactivated mid-session (not merely at login)", async () => {
    await prisma.user.update({ where: { id: activeRequesterId }, data: { isActive: false } });

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", cookieActive)
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: "notes.pdf",
        contentType: "application/pdf",
      });

    // attachSession re-checks isActive against the DB on every request, so
    // this is a 401 (session no longer valid), not the old 403.
    expect(res.status).toBe(401);

    // cleanup so this doesn't affect other tests relying on this seeded user
    await prisma.user.update({ where: { id: activeRequesterId }, data: { isActive: true } });
  });

  it("should return 404 when a different active requester tries to upload to a ticket they do not own (Lab 3: existence-hiding, not 403)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", cookieOther)
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: "notes.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(404);
  });

  it("should download an active attachment using the original filename in Content-Disposition", async () => {
    const upload = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", cookieActive)
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: "screenshot error.png",
        contentType: "image/png",
      });

    expect(upload.status).toBe(201);
    const attachmentId = upload.body.id;

    const download = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("Cookie", cookieActive);

    expect(download.status).toBe(200);
    expect(download.headers["content-disposition"]).toContain("screenshot error.png");
  });

  it("API-06b: preserves Thai characters and spaces in originalFileName", async () => {
    const originalFileName = "รายงาน ปัญหา_lab2.pdf";

    const upload = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("Cookie", cookieActive)
      .attach("file", Buffer.from("fake-pdf-content"), {
        filename: originalFileName,
        contentType: "application/pdf",
      });

    expect(upload.status).toBe(201);
    expect(upload.body.originalFileName).toBe(originalFileName);

    const metadata = await request(app)
      .get(`/api/attachments/${upload.body.id}`)
      .set("Cookie", cookieActive);

    expect(metadata.status).toBe(200);
    expect(metadata.body.originalFileName ?? metadata.body.fileName)
      .toBe(originalFileName);
  });
});

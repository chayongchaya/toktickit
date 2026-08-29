import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { Priority } from "@prisma/client";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = Router();

// สร้างโฟลเดอร์ uploads อัตโนมัติหากยังไม่มี
const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// กำหนด Multer Storage ให้จัดเก็บไฟล์จริงลง Disk
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: JPG, PNG, WEBP, PDF"));
    }
  },
});

function generateTicketNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `TIC-${timestamp}-${random}`;
}

// POST /api/tickets - สร้างตั๋วใหม่
router.post("/tickets", async (req: Request, res: Response) => {
  try {
    const {
      summary,
      title,
      description,
      categoryId,
      relatedSystemId,
      requestedPriority,
      priority,
      requesterId,
      requesterUserId,
    } = req.body;

    const finalSummary = summary || title;
    const finalRequesterId = requesterId || requesterUserId;
    const rawPriority = requestedPriority || priority;

    if (!finalSummary || typeof finalSummary !== "string" || !finalSummary.trim()) {
      return res.status(400).json({ error: "Summary/Title is required" });
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ error: "Description is required" });
    }
    if (!categoryId || isNaN(Number(categoryId))) {
      return res.status(400).json({ error: "Valid categoryId is required" });
    }
    if (!finalRequesterId || isNaN(Number(finalRequesterId))) {
      return res.status(400).json({ error: "Valid requesterId is required" });
    }
    if (!relatedSystemId || isNaN(Number(relatedSystemId))) {
      return res.status(400).json({ error: "Valid relatedSystemId is required" });
    }

    const validPriorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH];
    const ticketPriority: Priority =
      rawPriority && validPriorities.includes(rawPriority)
        ? (rawPriority as Priority)
        : Priority.MEDIUM;

    const prisma = getPrisma();

    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber: generateTicketNumber(),
        summary: finalSummary.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requesterId: Number(finalRequesterId),
        requestedPriority: ticketPriority,
        itPriority: ticketPriority,
      },
      include: {
        category: true,
        relatedSystem: true,
        requester: true,
      },
    });

    return res.status(201).json(newTicket);
  } catch (error) {
    console.error("POST /api/tickets error:", error);
    return res.status(500).json({ error: "Failed to create ticket" });
  }
});

// GET /api/tickets - ดึงรายการตั๋วทั้งหมดตาม Requester
router.get("/tickets", async (req: Request, res: Response) => {
  try {
    const { requesterId, status, search } = req.query;

    if (!requesterId || isNaN(Number(requesterId))) {
      return res.status(400).json({ error: "requesterId query parameter is required" });
    }

    const prisma = getPrisma();
    const where: any = {
      requesterId: Number(requesterId),
    };

    if (status && typeof status === "string" && status !== "ALL") {
      where.currentStatus = status;
    }

    if (search && typeof search === "string" && search.trim()) {
      where.OR = [
        { summary: { contains: search.trim(), mode: "insensitive" } },
        { ticketNumber: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        category: true,
        relatedSystem: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(tickets);
  } catch (error) {
    console.error("GET /api/tickets error:", error);
    return res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// GET /api/tickets/:id - ดึงรายละเอียดตั๋วรายใบ พร้อมประวัติไฟล์แนบทั้งหมด
router.get("/tickets/:id", async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);

    if (isNaN(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        relatedSystem: true,
        requester: true,
        attachments: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    return res.status(200).json(ticket);
  } catch (error) {
    console.error("GET /api/tickets/:id error:", error);
    return res.status(500).json({ error: "Failed to fetch ticket details" });
  }
});

// POST /api/tickets/:id/attachments - อัปโหลดไฟล์จริงด้วย multipart/form-data
router.post("/tickets/:id/attachments", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);

    if (isNaN(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "File upload is required." });
    }

    const prisma = getPrisma();

    // ตรวจสอบ Active Attachment Quota (สูงสุด 5 ไฟล์ต่อ 1 Ticket)
    const activeCount = await prisma.attachment.count({
      where: { ticketId, isRemoved: false },
    });
    if (activeCount >= 5) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: "Maximum limit of 5 active attachments reached." });
    }

    const newAttachment = await prisma.attachment.create({
      data: {
        ticketId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storagePath: file.path,
        isRemoved: false,
      },
    });

    return res.status(201).json(newAttachment);
  } catch (error: any) {
    console.error("POST /api/tickets/:id/attachments error:", error);
    return res.status(500).json({ error: error.message || "Failed to upload attachment" });
  }
});

// GET /api/attachments/:id/download - ส่งไฟล์จริงที่เก็บบน Disk ให้ Browser ดาวน์โหลด
router.get("/attachments/:id/download", async (req: Request, res: Response) => {
  try {
    const attachmentId = Number(req.params.id);

    if (isNaN(attachmentId)) {
      return res.status(400).json({ error: "Invalid attachment ID" });
    }

    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    // กฎข้อ 4.5: ไฟล์ที่ถูกลบไปแล้วจะต้องไม่สามารถดาวน์โหลดได้
    if (!attachment || attachment.isRemoved) {
      return res.status(404).json({ error: "Attachment not found or has been removed." });
    }

    // ตรวจสอบว่ามีไฟล์จริงอยู่บนดิสก์หรือไม่
    const resolvedPath = path.resolve(attachment.storagePath);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "Physical file not found on server." });
    }

    // ส่งไฟล์จริงกลับไปให้ดาวน์โหลด
    return res.download(resolvedPath, attachment.fileName);
  } catch (error) {
    console.error("GET /api/attachments/:id/download error:", error);
    return res.status(500).json({ error: "Failed to download attachment" });
  }
});

// DELETE /api/attachments/:id - Soft delete attachment พร้อมระบุเหตุผล
router.delete("/attachments/:id", async (req: Request, res: Response) => {
  try {
    const attachmentId = Number(req.params.id);
    const { removalReason } = req.body;

    if (isNaN(attachmentId)) {
      return res.status(400).json({ error: "Invalid attachment ID" });
    }

    if (!removalReason || typeof removalReason !== "string" || !removalReason.trim()) {
      return res.status(400).json({ error: "Removal reason is required" });
    }

    const prisma = getPrisma();
    const existing = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        isRemoved: true,
        removalReason: removalReason.trim(),
        removedAt: new Date(),
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("DELETE /api/attachments/:id error:", error);
    return res.status(500).json({ error: "Failed to remove attachment" });
  }
});

export default router;
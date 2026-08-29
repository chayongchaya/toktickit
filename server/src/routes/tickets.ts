import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { Priority } from "@prisma/client";

const router = Router();

// ฟังก์ชันสร้าง ticketNumber แบบสุ่ม/ตาม timestamp
function generateTicketNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `TIC-${timestamp}-${random}`;
}

// POST /api/tickets
router.post("/tickets", async (req: Request, res: Response) => {
  try {
    const {
      summary,
      title, // รองรับทั้ง summary หรือ title
      description,
      categoryId,
      relatedSystemId,
      requestedPriority,
      priority, // รองรับทั้ง requestedPriority หรือ priority
      requesterId,
      requesterUserId, // รองรับทั้ง requesterId หรือ requesterUserId
    } = req.body;

    const finalSummary = summary || title;
    const finalRequesterId = requesterId || requesterUserId;
    const rawPriority = requestedPriority || priority;

    // Validation
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

// GET /api/tickets - ดึงรายการตั๋วพร้อม Filter & Search
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

// GET /api/tickets/:id - ดึงรายละเอียดตั๋วรายใบ พร้อมไฟล์แนบที่ยังไม่ถูกลบ
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
        attachments: {
          where: {
            isRemoved: false,
          },
        },
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

// DELETE /api/attachments/:id - Soft delete attachment พร้อมระบุ removalReason
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
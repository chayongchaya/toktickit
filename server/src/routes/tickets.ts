import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getPrisma } from "../prisma.js";

export const ticketsRouter = Router();
export const attachmentsRouter = Router();
const prisma = getPrisma();

// Configure storage for file uploads
const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Allowed MIME types: JPG, PNG, WEBP, PDF
const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_FILE_TYPE"));
    }
  },
});

// Helper: Extract requesterId from Header, Query, or Body
const getRequesterId = (req: Request): number | null => {
  const headerVal = req.headers["x-requester-id"];
  const queryVal = req.query.requesterId;
  const bodyVal = req.body?.requesterId;

  const val = headerVal || queryVal || bodyVal;
  if (!val) return null;

  const id = Number(val);
  return isNaN(id) ? null : id;
};

// Helper: Generate unique ticket number (TKT-YYYY-XXXXXX)
const generateTicketNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const count = await prisma.ticket.count();
  const nextNumber = (count + 1).toString().padStart(6, "0");
  return `TKT-${currentYear}-${nextNumber}`;
};

// ==========================================
// TICKETS ROUTER (/api/tickets)
// ==========================================

// 1. GET /api/tickets (Paginated & Filtered)
ticketsRouter.get("/", async (req: Request, res: Response) => {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    return res.status(400).json({ error: "Requester identity is required" });
  }

  try {
    const {
      search,
      categoryId,
      requestedPriority,
      currentStatus,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      pageSize = "10",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limit = Math.max(1, parseInt(pageSize as string, 10) || 10);
    const skip = (pageNum - 1) * limit;

    const whereClause: any = {
      requesterId,
    };

    if (search && typeof search === "string" && search.trim() !== "") {
      whereClause.OR = [
        { ticketNumber: { contains: search.trim(), mode: "insensitive" } },
        { summary: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      whereClause.categoryId = Number(categoryId);
    }

    if (requestedPriority && typeof requestedPriority === "string") {
      whereClause.requestedPriority = requestedPriority;
    }

    if (currentStatus && typeof currentStatus === "string") {
      whereClause.currentStatus = currentStatus;
    }

    const validSortFields = ["ticketNumber", "createdAt", "updatedAt"];
    const sortField = validSortFields.includes(sortBy as string)
      ? (sortBy as string)
      : "createdAt";
    const sortDirection = sortOrder === "asc" ? "asc" : "desc";

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where: whereClause }),
      prisma.ticket.findMany({
        where: whereClause,
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
        },
        orderBy: { [sortField]: sortDirection },
        skip,
        take: limit,
      }),
    ]);

    return res.status(200).json({
      data: tickets,
      tickets: tickets,
      pagination: {
        total,
        page: pageNum,
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve tickets" });
  }
});

// 2. POST /api/tickets (Create Ticket)
ticketsRouter.post("/", async (req: Request, res: Response) => {
  const { categoryId, relatedSystemId, requestedPriority, summary, description } =
    req.body;

  if (
    !summary ||
    typeof summary !== "string" ||
    summary.trim().length < 5 ||
    summary.trim().length > 100
  ) {
    return res.status(400).json({
      error: "Summary is required (must be between 5 and 100 characters)",
    });
  }

  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length < 10 ||
    description.trim().length > 2000
  ) {
    return res.status(400).json({
      error: "Description is required (must be between 10 and 2000 characters)",
    });
  }

  if (!categoryId || !relatedSystemId || !requestedPriority) {
    return res.status(400).json({
      error: "Category, related system, and priority are required",
    });
  }

  const requesterId = getRequesterId(req);
  if (!requesterId) {
    return res.status(400).json({ error: "Requester identity is required" });
  }

  try {
    const ticketNumber = await generateTicketNumber();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId,
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requestedPriority,
        itPriority: requestedPriority,
        currentStatus: "NEW",
        summary: summary.trim(),
        description: description.trim(),
      },
    });

    return res.status(201).json(ticket);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create ticket" });
  }
});

// 3. GET /api/tickets/:id (Ticket Details)
ticketsRouter.get("/:id", async (req: Request, res: Response) => {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    return res.status(400).json({ error: "Requester identity is required" });
  }

  const ticketId = Number(req.params.id);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: "Invalid ticket ID" });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            isRemoved: true,
            removalReason: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Strict Ownership Check
    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({ error: "Forbidden: You do not own this ticket" });
    }

    return res.status(200).json(ticket);
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve ticket details" });
  }
});

// 4. POST /api/tickets/:id/attachments (Upload)
ticketsRouter.post(
  "/:id/attachments",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File size exceeds 5 MB limit" });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        if (err.message === "INVALID_FILE_TYPE") {
          return res.status(400).json({
            error: "Only JPG, PNG, WEBP, and PDF files are allowed",
          });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(400).json({ error: "Requester identity is required" });
    }

    const ticketId = Number(req.params.id);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          attachments: {
            where: { isRemoved: false },
          },
        },
      });

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Strict Ownership Check
      if (ticket.requesterId !== requesterId) {
        return res.status(403).json({ error: "Forbidden: You do not own this ticket" });
      }

      // Max 5 active attachments limit
      if (ticket.attachments.length >= 5) {
        return res.status(400).json({
          error: "A ticket can have a maximum of 5 active attachments",
        });
      }

      const attachment = await prisma.attachment.create({
        data: {
          ticketId,
          fileName: req.file.filename,
          storagePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          isRemoved: false,
        },
      });

      return res.status(201).json(attachment);
    } catch (error) {
      return res.status(500).json({ error: "Failed to upload attachment" });
    }
  }
);

// ==========================================
// ATTACHMENTS ROUTER (/api/attachments)
// ==========================================

// 5. DELETE /api/attachments/:id (Soft Remove)
attachmentsRouter.delete("/:id", async (req: Request, res: Response) => {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    return res.status(400).json({ error: "Requester identity is required" });
  }

  const attachmentId = Number(req.params.id);
  const { removalReason } = req.body;

  if (isNaN(attachmentId)) {
    return res.status(400).json({ error: "Invalid attachment ID" });
  }

  if (
    !removalReason ||
    typeof removalReason !== "string" ||
    removalReason.trim().length === 0
  ) {
    return res.status(400).json({ error: "removalReason is required" });
  }

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // Ownership Check
    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "Forbidden: You do not own this attachment",
      });
    }

    if (attachment.isRemoved) {
      return res.status(400).json({ error: "Attachment is already removed" });
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
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 6. GET /api/attachments/:id/download (Download Stream)
attachmentsRouter.get("/:id/download", async (req: Request, res: Response) => {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    return res.status(400).json({ error: "Requester identity is required" });
  }

  const attachmentId = Number(req.params.id);
  if (isNaN(attachmentId)) {
    return res.status(400).json({ error: "Invalid attachment ID" });
  }

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // Ownership Check
    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "Forbidden: You do not own this attachment",
      });
    }

    // Block download if soft-removed
    if (attachment.isRemoved) {
      return res.status(404).json({
        error: "Attachment is removed and cannot be downloaded",
      });
    }

    const filePath = attachment.storagePath || path.resolve(uploadDir, attachment.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${attachment.fileName}"`
    );
    res.setHeader("Content-Type", attachment.mimeType);
    return res.sendFile(filePath);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Prisma } from "@prisma/client";
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

// Valid Priority enum values (kept in sync with schema.prisma "Priority" enum)
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

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

// Helper: Load a requester and classify it as missing / inactive / active.
// Used to enforce AC-11: ticket creation and attachment upload must be
// rejected for a requesterId that does not exist or is not active, even
// when the request bypasses the UI selector.
type RequesterCheck =
  | { status: "missing" }
  | { status: "inactive" }
  | { status: "ok"; id: number };

const checkRequester = async (requesterId: number): Promise<RequesterCheck> => {
  const requester = await prisma.requesterUser.findUnique({
    where: { id: requesterId },
    select: { id: true, isActive: true },
  });
  if (!requester) return { status: "missing" };
  if (!requester.isActive) return { status: "inactive" };
  return { status: "ok", id: requester.id };
};

// Helper: Generate a unique ticket number in the required TKT-YYYY-XXXXXX
// format (see specification.md BR-01 and api-spec.md examples). The
// number is based on the current row count; true uniqueness is enforced
// by the DB unique constraint on ticketNumber plus the retry loop in
// createTicketWithUniqueNumber below, so concurrent requests that would
// otherwise compute the same count simply retry with a freshly recomputed
// (higher) count once the earlier request has committed.
export const generateTicketNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const count = await prisma.ticket.count();
  const nextNumber = (count + 1).toString().padStart(6, "0");
  return `TKT-${currentYear}-${nextNumber}`;
};

// Helper: Create a ticket, retrying with a fresh ticket number if a
// unique-constraint collision occurs on ticketNumber (BR-01: the official
// Ticket Number must be unique, even under concurrent submissions).
const MAX_TICKET_NUMBER_RETRIES = 5;

const createTicketWithUniqueNumber = async (
  data: Omit<Prisma.TicketUncheckedCreateInput, "ticketNumber">
) => {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_TICKET_NUMBER_RETRIES; attempt++) {
    const ticketNumber = await generateTicketNumber();
    try {
      return await prisma.ticket.create({
        data: { ...data, ticketNumber },
      });
    } catch (error) {
      const isUniqueConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray((error.meta as { target?: string[] })?.target) &&
        (error.meta as { target?: string[] }).target?.includes("ticketNumber");

      if (isUniqueConflict) {
        lastError = error;
        continue; // retry with a newly generated ticket number
      }
      throw error;
    }
  }
  throw lastError ?? new Error("Failed to generate a unique ticket number");
};

// Helper: Duplicate-submission guard (spec 4.3 "validation and
// duplicate-submission prevention"). The Create Ticket UI disables the
// Submit button while a request is in flight, but that alone does not
// protect the server against a resubmitted/retried request (e.g. a
// double-click that fires before the button disables, or a client-side
// network retry). This keeps a short-lived in-memory record of recent
// (requesterId, summary, description) submissions and rejects an
// identical resubmission within the window with 409 Conflict instead of
// silently creating a second ticket.
const DUPLICATE_SUBMISSION_WINDOW_MS = 10_000;
const recentSubmissions = new Map<string, number>();

const duplicateSubmissionKey = (
  requesterId: number,
  summary: string,
  description: string
) => `${requesterId}::${summary.trim()}::${description.trim()}`;

const isDuplicateSubmission = (key: string): boolean => {
  const now = Date.now();
  // Opportunistically clear stale entries so the map doesn't grow forever.
  for (const [existingKey, submittedAt] of recentSubmissions) {
    if (now - submittedAt > DUPLICATE_SUBMISSION_WINDOW_MS) {
      recentSubmissions.delete(existingKey);
    }
  }
  const lastSubmittedAt = recentSubmissions.get(key);
  if (lastSubmittedAt && now - lastSubmittedAt < DUPLICATE_SUBMISSION_WINDOW_MS) {
    return true;
  }
  recentSubmissions.set(key, now);
  return false;
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
      itPriority,
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

    if (
      requestedPriority &&
      typeof requestedPriority === "string" &&
      VALID_PRIORITIES.includes(requestedPriority)
    ) {
      whereClause.requestedPriority = requestedPriority;
    }

    if (
      itPriority &&
      typeof itPriority === "string" &&
      VALID_PRIORITIES.includes(itPriority)
    ) {
      whereClause.itPriority = itPriority;
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

  // Guard against non-numeric categoryId/relatedSystemId (e.g. "abc") before
  // they ever reach Prisma. Without this, Number("abc") becomes NaN and the
  // findUnique/create calls below throw, which was falling through to a
  // generic 500 instead of a clean 400 (safe-errors requirement, spec 6.3).
  const categoryIdNum = Number(categoryId);
  const relatedSystemIdNum = Number(relatedSystemId);
  if (Number.isNaN(categoryIdNum) || Number.isNaN(relatedSystemIdNum)) {
    return res.status(400).json({
      error: "Category and related system IDs must be valid numbers",
    });
  }

  if (
    typeof requestedPriority !== "string" ||
    !VALID_PRIORITIES.includes(requestedPriority)
  ) {
    return res.status(400).json({
      error: `Requested priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
    });
  }

  const requesterId = getRequesterId(req);
  if (!requesterId) {
    return res.status(400).json({ error: "Requester identity is required" });
  }

  const submissionKey = duplicateSubmissionKey(requesterId, summary, description);
  if (isDuplicateSubmission(submissionKey)) {
    return res.status(409).json({
      error: "This ticket was already submitted. Please wait before resubmitting.",
    });
  }

  try {
    // Enforce AC-11: reject ticket creation for a missing/inactive requester,
    // even if the request bypasses the UI selector.
    const requesterCheck = await checkRequester(requesterId);
    if (requesterCheck.status === "missing") {
      return res.status(404).json({ error: "Requester not found" });
    }
    if (requesterCheck.status === "inactive") {
      return res.status(403).json({
        error: "This Development Requester is inactive and cannot create tickets",
      });
    }

    // Validate that Category and Related System exist and are active,
    // rather than letting an invalid foreign key fall through to a
    // generic 500 error.
    const [category, relatedSystem] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryIdNum } }),
      prisma.relatedSystem.findUnique({ where: { id: relatedSystemIdNum } }),
    ]);

    if (!category || !category.isActive) {
      return res.status(400).json({ error: "Category is invalid or inactive" });
    }
    if (!relatedSystem || !relatedSystem.isActive) {
      return res.status(400).json({ error: "Related System is invalid or inactive" });
    }

    const ticket = await createTicketWithUniqueNumber({
      requesterId,
      categoryId: categoryIdNum,
      relatedSystemId: relatedSystemIdNum,
      requestedPriority,
      // IT Priority is a separate, IT-Staff-assigned value (Figure 1 shows
      // it can differ from Requested Priority) and is out of scope for
      // Requester-facing Lab 2. It must default independently rather than
      // mirroring whatever the Requester picked.
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      summary: summary.trim(),
      description: description.trim(),
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
            originalFileName: true,
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

    // Defensive fallback: never expose a blank filename to the UI, even
    // for a legacy row where originalFileName ended up empty for any
    // reason. The migration backfills existing rows, but this keeps the
    // API response safe regardless.
    const ticketWithSafeAttachments = {
      ...ticket,
      attachments: ticket.attachments.map((att) => ({
        ...att,
        originalFileName: att.originalFileName || att.fileName,
      })),
    };

    return res.status(200).json(ticketWithSafeAttachments);
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
      // Enforce AC-11: reject attachment upload for a missing/inactive
      // requester, even if the request bypasses the UI selector.
      const requesterCheck = await checkRequester(requesterId);
      if (requesterCheck.status === "missing") {
        return res.status(404).json({ error: "Requester not found" });
      }
      if (requesterCheck.status === "inactive") {
        return res.status(403).json({
          error: "This Development Requester is inactive and cannot upload attachments",
        });
      }

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
          fileName: req.file.filename, // generated storage filename (on disk)
          originalFileName: req.file.originalname, // requester's original filename (shown in UI)
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

    // Present the requester's original filename to the browser/download
    // dialog, not the internally generated storage filename.
    const downloadName = attachment.originalFileName || attachment.fileName;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadName}"`
    );
    res.setHeader("Content-Type", attachment.mimeType);
    return res.sendFile(filePath);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

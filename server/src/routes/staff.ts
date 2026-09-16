import { Router, Request, Response } from "express";
import fs from "fs";
import { getPrisma } from "../prisma.js";
import { TICKET_STATUSES, TICKET_TRANSITIONS } from "../lib/ticketTransitions.js";

export const staffRouter = Router();
const prisma = getPrisma();
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

const ticketDetailInclude = {
  requester: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
  attachments: { select: { id: true, fileName: true, originalFileName: true, fileSize: true, mimeType: true, isRemoved: true, removalReason: true, createdAt: true, storagePath: true } },
  publicComments: { orderBy: { createdAt: "asc" as const }, select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } },
  internalNotes: { orderBy: { createdAt: "asc" as const }, select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } },
};

function withAttachmentAvailability<T extends { attachments: Array<{ storagePath: string; isRemoved: boolean }> }>(ticket: T) {
  return {
    ...ticket,
    attachments: ticket.attachments.map(({ storagePath, ...attachment }) => ({
      ...attachment,
      isUnavailable: !attachment.isRemoved && !fs.existsSync(storagePath),
    })),
  };
}

// Active users who are allowed to own tickets; this list is independent of
// the current ticket page and any queue filters.
staffRouter.get("/owners", async (_req: Request, res: Response) => {
  try {
    const owners = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } },
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: { name: "asc" },
    });
    return res.json(owners);
  } catch {
    return res.status(500).json({ error: "Failed to retrieve ticket owners" });
  }
});

staffRouter.get("/tickets/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid ticket ID" });
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id }, include: ticketDetailInclude });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    const responseTicket = withAttachmentAvailability(ticket);
    return res.json({ ...responseTicket, ownerId: ticket.ownerId, ownerName: ticket.owner?.name ?? null });
  } catch {
    return res.status(500).json({ error: "Failed to retrieve staff ticket details" });
  }
});

staffRouter.patch("/tickets/:id/owner", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid ticket ID" });
  const ownerId = req.body?.ownerId;
  if (typeof ownerId !== "number" || !Number.isInteger(ownerId)) return res.status(400).json({ error: "ownerId must be a number", field: "ownerId" });
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    const owner = await prisma.user.findFirst({ where: { id: ownerId, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } } });
    if (!owner) return res.status(409).json({ error: "Ticket owner must be an active IT Staff or Administrator user" });
    const updated = await prisma.ticket.update({ where: { id }, data: { ownerId }, include: ticketDetailInclude });
    const responseTicket = withAttachmentAvailability(updated);
    return res.json({ ...responseTicket, ownerId: updated.ownerId, ownerName: updated.owner?.name ?? null });
  } catch {
    return res.status(500).json({ error: "Failed to update ticket owner" });
  }
});

staffRouter.patch("/tickets/:id/priority", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid ticket ID" });
  const itPriority = req.body?.itPriority;
  if (!(PRIORITIES as readonly string[]).includes(itPriority)) return res.status(400).json({ error: "Invalid IT priority", field: "itPriority" });
  try {
    const exists = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return res.status(404).json({ error: "Ticket not found" });
    const updated = await prisma.ticket.update({ where: { id }, data: { itPriority }, include: ticketDetailInclude });
    const responseTicket = withAttachmentAvailability(updated);
    return res.json({ ...responseTicket, ownerId: updated.ownerId, ownerName: updated.owner?.name ?? null });
  } catch {
    return res.status(500).json({ error: "Failed to update IT priority" });
  }
});

staffRouter.patch("/tickets/:id/status", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid ticket ID" });
  const currentStatus = req.body?.currentStatus;
  if (!(TICKET_STATUSES as readonly string[]).includes(currentStatus)) return res.status(400).json({ error: "Invalid status value", field: "currentStatus" });
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (!(TICKET_TRANSITIONS[ticket.currentStatus] ?? []).includes(currentStatus)) return res.status(409).json({ error: `Transition from ${ticket.currentStatus} to ${currentStatus} is not permitted` });
    const updated = await prisma.ticket.update({ where: { id }, data: { currentStatus }, include: ticketDetailInclude });
    const responseTicket = withAttachmentAvailability(updated);
    return res.json({ ...responseTicket, ownerId: updated.ownerId, ownerName: updated.owner?.name ?? null });
  } catch {
    return res.status(500).json({ error: "Failed to update ticket status" });
  }
});

// GET /api/staff/tickets - the shared IT Staff/Administrator queue.
staffRouter.get("/tickets", async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? "10"), 10) || 10);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  // `category` is the Lab 3 contract; accepting the older `categoryId` name
  // as an alias keeps the queue tolerant of clients sharing Lab 2 filters.
  const category = typeof req.query.category === "string"
    ? req.query.category
    : typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const requestedPriority = typeof req.query.requestedPriority === "string" ? req.query.requestedPriority : undefined;
  const itPriority = typeof req.query.itPriority === "string" ? req.query.itPriority : undefined;
  const owner = typeof req.query.owner === "string" ? req.query.owner : undefined;
  const requestedSort = typeof req.query.sort === "string" ? req.query.sort : "createdAt";
  const sort = ["createdAt", "updatedAt", "itPriority"].includes(requestedSort)
    ? requestedSort
    : "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

  const where: any = {};
  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status && (TICKET_STATUSES as readonly string[]).includes(status)) where.currentStatus = status;
  if (category && Number.isFinite(Number(category))) where.categoryId = Number(category);
  if (requestedPriority && (PRIORITIES as readonly string[]).includes(requestedPriority)) where.requestedPriority = requestedPriority;
  if (itPriority && (PRIORITIES as readonly string[]).includes(itPriority)) where.itPriority = itPriority;
  if (owner === "unassigned") where.ownerId = null;
  else if (owner && Number.isFinite(Number(owner))) where.ownerId = Number(owner);

  try {
    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
        // Use a stable secondary key so equal timestamps/priorities have the
        // same order across equivalent requests and page boundaries.
        orderBy: [{ [sort]: sortOrder }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.json({
      data: tickets.map((ticket: (typeof tickets)[number]) => ({
        ...ticket,
        ownerId: ticket.ownerId,
        ownerName: ticket.owner?.name ?? null,
      })),
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 },
    });
  } catch {
    return res.status(500).json({ error: "Failed to retrieve staff ticket queue" });
  }
});

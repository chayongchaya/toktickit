import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const staffRouter = Router();
const prisma = getPrisma();
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const STATUSES = [
  "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER",
  "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
] as const;

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
  if (status && (STATUSES as readonly string[]).includes(status)) where.currentStatus = status;
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
      data: tickets.map((ticket) => ({
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

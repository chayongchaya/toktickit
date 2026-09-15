import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const notesRouter = Router();
const prisma = getPrisma();
const MAX_NOTE_LENGTH = 2000;

function staffOnly(req: Request, res: Response): boolean {
  if (req.user?.role !== "IT_STAFF" && req.user?.role !== "ADMINISTRATOR") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

async function ticketExists(id: number) {
  return prisma.ticket.findUnique({ where: { id }, select: { id: true } });
}

notesRouter.get("/:id/notes", async (req: Request, res: Response) => {
  if (!staffOnly(req, res)) return;
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });
  try {
    if (!await ticketExists(ticketId)) return res.status(404).json({ error: "Ticket not found" });
    const notes = await prisma.internalNote.findMany({ where: { ticketId }, orderBy: { createdAt: "asc" }, select: { id: true, ticketId: true, content: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } });
    return res.json(notes);
  } catch {
    return res.status(500).json({ error: "Failed to load internal notes" });
  }
});

notesRouter.post("/:id/notes", async (req: Request, res: Response) => {
  if (!staffOnly(req, res)) return;
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });
  const content = req.body?.content;
  if (typeof content !== "string" || content.trim().length === 0) return res.status(400).json({ error: "Content is required", field: "content" });
  if (content.length > MAX_NOTE_LENGTH) return res.status(400).json({ error: "Content must be 2,000 characters or fewer", field: "content" });
  try {
    if (!await ticketExists(ticketId)) return res.status(404).json({ error: "Ticket not found" });
    const note = await prisma.internalNote.create({ data: { ticketId, authorId: req.user!.id, content: content.trim() }, select: { id: true, ticketId: true, content: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } });
    return res.status(201).json(note);
  } catch {
    return res.status(500).json({ error: "Failed to create internal note" });
  }
});

import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

const router = Router();

// GET /api/systems - ดึงเฉพาะ active systems เรียงตาม id หรือ name
router.get("/systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return res.status(200).json(systems);
  } catch (error) {
    console.error("GET /api/systems error:", error);
    return res.status(500).json({ error: "Failed to fetch systems" });
  }
});

export default router;
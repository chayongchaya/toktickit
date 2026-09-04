import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

const router = Router();

const getSystemsHandler = async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return res.status(200).json(systems);
  } catch (error) {
    console.error("GET systems error:", error);
    return res.status(500).json({ error: "Failed to fetch systems" });
  }
};

// รองรับทั้ง /api/related-systems และ /api/systems
router.get("/related-systems", getSystemsHandler);
router.get("/systems", getSystemsHandler);

export default router;
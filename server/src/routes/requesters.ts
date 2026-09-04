import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

const router = Router();

router.get("/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });
    return res.status(200).json(requesters);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch requesters" });
  }
});

export default router;
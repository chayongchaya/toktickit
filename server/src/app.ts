import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { getPrisma } from "./prisma.js";
import requesterRoutes from "./routes/requesters.js";
import systemRoutes from "./routes/systems.js";
import { ticketsRouter, attachmentsRouter } from "./routes/tickets.js";

export const app = express();

app.use(cors());
app.use(express.json());

// Serve static uploaded files
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
});

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Routes สำหรับ Lab 2
app.use("/api", requesterRoutes);
app.use("/api", systemRoutes);
app.use("/api/related-systems", systemRoutes); // รองรับทั้ง /api/related-systems
app.use("/api/tickets", ticketsRouter);
app.use("/api/attachments", attachmentsRouter);

export default app;
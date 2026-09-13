import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getPrisma } from "./prisma.js";
import requesterRoutes from "./routes/requesters.js";
import systemRoutes from "./routes/systems.js";
import { ticketsRouter, attachmentsRouter } from "./routes/tickets.js";
import { authRouter } from "./routes/auth.js";
import { attachSession, requireAuth, blockIfMustChangePassword } from "./middleware/auth.js";

export const app = express();

// Lab 3: credentials: true + an explicit echoed origin (never "*") is
// required for the session cookie to be sent/received cross-origin between
// the Vite dev server and this API. See .env.example's FRONTEND_ORIGIN.
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Populates req.user (if a valid session cookie is present) ahead of every
// route below, including public ones. It never rejects a request itself —
// see middleware/auth.ts.
app.use(attachSession);

// NOTE: uploaded attachment files are intentionally NOT served as a public
// static directory here. Section 4.5 of the Lab 2 handout requires that
// (a) removed attachments must not be downloadable/previewable and
// (b) one Requester must never be able to access another Requester's
// attachment. Both of those checks live in
// GET /api/attachments/:id/download (ownership + isRemoved check), so all
// attachment access must go through that endpoint. Mounting
// express.static("/uploads", ...) would let anyone who knows/guesses a
// stored filename bypass both checks entirely, so it must not be added
// back without also re-implementing ownership + removal checks in front
// of it.

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
      where: { isActive: true },
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

// Auth routes are public at the router level (login has no guard); /me,
// /logout, and /change-password each apply requireAuth individually inside
// auth.ts. This router is deliberately NOT wrapped in
// blockIfMustChangePassword, since a user who must change their password
// still needs to reach /change-password and /logout (FR-05).
app.use("/api/auth", authRouter);

// Routes สำหรับ Lab 2
// systemRoutes already defines its own "/related-systems" and "/systems"
// sub-paths, so mounting it once at "/api" is enough to expose both
// GET /api/related-systems and GET /api/systems. Mounting it again at
// "/api/related-systems" was dead/broken code (it would resolve to
// "/api/related-systems/related-systems") and has been removed.
app.use("/api", requesterRoutes);
app.use("/api", systemRoutes);

// Lab 3: every ticket/attachment route now requires an authenticated
// session with its password change already completed. This is
// authentication-foundation scope only — the *internal* logic of these
// routers still derives identity from the old x-requester-id
// header/query/body pattern (getRequesterId in tickets.ts) rather than
// req.user until the "requester regression" branch rewires it. Until that
// branch lands, these routes will correctly demand login but will not yet
// use the logged-in identity for ownership checks — a known, tracked,
// intentional gap between these two branches, not an oversight.
app.use("/api/tickets", requireAuth, blockIfMustChangePassword, ticketsRouter);
app.use("/api/attachments", requireAuth, blockIfMustChangePassword, attachmentsRouter);

export default app;

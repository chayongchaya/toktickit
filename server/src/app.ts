import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getPrisma } from "./prisma.js";
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
// GET /api/requesters (the old Development Requester selector's data
// source) has been removed entirely, not just left unused — it existed
// only to populate SelectRequesterPage, which BR-32 retires along with
// RequesterContext. Keeping the endpoint around would be dead code that
// still queried a table shape (RequesterUser) that no longer exists.
//
// systemRoutes already defines its own "/related-systems" and "/systems"
// sub-paths, so mounting it once at "/api" is enough to expose both
// GET /api/related-systems and GET /api/systems. Mounting it again at
// "/api/related-systems" was dead/broken code (it would resolve to
// "/api/related-systems/related-systems") and has been removed.
app.use("/api", systemRoutes);

// Lab 3: every ticket/attachment route requires an authenticated session
// with its password change already completed, AND (as of the "requester
// regression" branch) derives the acting Requester's identity from
// req.user.id exclusively — see tickets.ts's top-of-file comment. The old
// x-requester-id header/query/body path and the 403-for-not-mine responses
// have both been removed from every handler in that file.
app.use("/api/tickets", requireAuth, blockIfMustChangePassword, ticketsRouter);
app.use("/api/attachments", requireAuth, blockIfMustChangePassword, attachmentsRouter);

export default app;

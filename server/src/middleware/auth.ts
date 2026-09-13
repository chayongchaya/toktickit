import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";
import { touchSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "../lib/session.js";
import { Role } from "@prisma/client";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const prisma = getPrisma();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

// Parses the session cookie (if any), re-validates it against the database
// on every request — not just against the in-memory session store — so a
// deactivated account loses access on its very next request (AC-27), not
// only after its session naturally expires. Always calls next(); this
// middleware never itself rejects a request. It is safe to mount globally,
// including in front of public routes, since it simply leaves req.user
// undefined when there is no valid session.
export async function attachSession(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (!sessionId) return next();

  const userId = touchSession(sessionId);
  if (!userId) {
    res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
    return next();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true },
  });

  if (!user || !user.isActive) {
    // BR-01 / AC-27: an inactive (or since-deleted) account cannot continue
    // to act as if logged in just because its session token is still valid.
    res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
    return next();
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };

  // Sliding idle expiration: refresh the cookie's lifetime on every
  // authenticated request, matching touchSession's server-side refresh.
  res.cookie(SESSION_COOKIE_NAME, sessionId, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });

  next();
}

// FR-07 step 1: unauthenticated access is always checked first, before any
// role or resource check.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// FR-07 step 2: authenticated but wrong role. Always mount requireAuth
// before requireRole so an unauthenticated request gets 401, not 403.
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// api-spec.md §2's mandatory-password-change gate: applied to every
// protected router except the auth router itself, so a user who must
// change their password can still reach POST /api/auth/change-password and
// POST /api/auth/logout, but nothing else (FR-05).
export function blockIfMustChangePassword(req: Request, res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({ error: "Password change required before continuing." });
  }
  next();
}

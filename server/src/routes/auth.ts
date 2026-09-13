import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "../lib/password.js";
import { createSession, destroySession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "../lib/session.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();
const prisma = getPrisma();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

function serializeUser(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

// POST /api/auth/login — public.
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required", field: "email" });
  }
  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password is required", field: "password" });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // BR-01/FR-02/AC-05: identical response for "no such user", "wrong
  // password", and "correct password but inactive account" — the client
  // must never be able to tell these three apart.
  const invalidCredentials = () =>
    res.status(401).json({ error: "Invalid email or password." });

  if (!user) return invalidCredentials();

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) return invalidCredentials();
  if (!user.isActive) return invalidCredentials();

  const sessionId = createSession(user.id);
  res.cookie(SESSION_COOKIE_NAME, sessionId, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });
  return res.status(200).json(serializeUser(user));
});

// POST /api/auth/logout — authenticated. Real server-side invalidation
// (BR-06), not a client-side no-op: the session id is removed from the
// server-side store, so replaying the old cookie afterward yields 401.
authRouter.post("/logout", requireAuth, async (req: Request, res: Response) => {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (sessionId) destroySession(sessionId);
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
  return res.status(204).send();
});

// GET /api/auth/me — authenticated. Reachable even when mustChangePassword
// is true (the client shell needs this to decide whether to show the
// Change Password screen in the first place).
authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  return res.status(200).json(serializeUser(req.user!));
});

// POST /api/auth/change-password — authenticated, reachable even when
// mustChangePassword is true (this and logout are the only two routes
// exempted from the global blockIfMustChangePassword gate — see app.ts).
authRouter.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body ?? {};

  if (!currentPassword || typeof currentPassword !== "string") {
    return res.status(400).json({ error: "Current password is required", field: "currentPassword" });
  }
  if (!newPassword || typeof newPassword !== "string") {
    return res.status(400).json({ error: "New password is required", field: "newPassword" });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });

  const currentMatches = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentMatches) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  const policy = validatePasswordPolicy(newPassword);
  if (!policy.valid) {
    return res.status(400).json({
      error: `New password must include ${policy.failedRules.join(", ")}.`,
      field: "newPassword",
    });
  }

  // BR-05: the new password must differ from the current one. Checked only
  // after the current password itself is confirmed correct, and only after
  // the new password already passes the policy — this is a same-request
  // input problem (the *value* chosen is invalid), not a resource-state
  // conflict, so it is a 400 on the newPassword field, not a 409.
  const sameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    return res.status(400).json({
      error: "New password must differ from the current password.",
      field: "newPassword",
    });
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePassword: false },
  });

  return res.status(200).json({ mustChangePassword: false });
});
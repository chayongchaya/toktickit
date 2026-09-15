import { Request, Response, Router } from "express";
import { Role } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { hashPassword, validatePasswordPolicy } from "../lib/password.js";

export const adminRouter = Router();
const prisma = getPrisma();
const ROLES = [Role.REQUESTER, Role.IT_STAFF, Role.ADMINISTRATOR] as const;

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
} as const;

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function isValidId(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0;
}

function serializeUser(user: { id: number; name: string; email: string; role: Role; isActive: boolean; mustChangePassword: boolean; createdAt: Date; updatedAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function validatePassword(value: unknown, field: string) {
  if (typeof value !== "string" || !value) return { error: { error: "Initial password is required", field } };
  const policy = validatePasswordPolicy(value);
  if (!policy.valid) return { error: { error: `Password must include ${policy.failedRules.join(", ")}.`, field } };
  return { value };
}

adminRouter.get("/users", async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const role = typeof req.query.role === "string" ? req.query.role : "";
    if (role && !isRole(role)) return res.status(400).json({ error: "Invalid role", field: "role" });
    const users = await prisma.user.findMany({
      where: {
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
        ...(role ? { role: role as Role } : {}),
      },
      select: publicUserSelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return res.json(users.map(serializeUser));
  } catch {
    return res.status(500).json({ error: "Failed to retrieve users" });
  }
});

adminRouter.post("/users", async (req: Request, res: Response) => {
  const { name, email, role, isActive = true, initialPassword } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) return res.status(400).json({ error: "Name is required", field: "name" });
  if (typeof email !== "string" || !email.trim()) return res.status(400).json({ error: "Email is required", field: "email" });
  if (!isRole(role)) return res.status(400).json({ error: "Invalid role", field: "role" });
  if (typeof isActive !== "boolean") return res.status(400).json({ error: "Active state must be a boolean", field: "isActive" });
  const password = validatePassword(initialPassword, "initialPassword");
  if (password.error) return res.status(400).json(password.error);

  const normalizedEmail = email.trim().toLowerCase();
  try {
    const duplicate = await prisma.user.findFirst({ where: { email: { equals: normalizedEmail, mode: "insensitive" } }, select: { id: true } });
    if (duplicate) return res.status(409).json({ error: "A user with this email already exists", field: "email" });
    const user = await prisma.user.create({
      data: { name: name.trim(), email: normalizedEmail, role, isActive, passwordHash: await hashPassword(password.value!), mustChangePassword: true },
      select: publicUserSelect,
    });
    return res.status(201).json(serializeUser(user));
  } catch {
    return res.status(500).json({ error: "Failed to create user" });
  }
});

adminRouter.patch("/users/:id", async (req: Request, res: Response) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: "User not found" });
  const id = Number(req.params.id);
  const { name, email, role, isActive } = req.body ?? {};
  if (name !== undefined && (typeof name !== "string" || !name.trim())) return res.status(400).json({ error: "Name is required", field: "name" });
  if (email !== undefined && (typeof email !== "string" || !email.trim())) return res.status(400).json({ error: "Email is required", field: "email" });
  if (role !== undefined && !isRole(role)) return res.status(400).json({ error: "Invalid role", field: "role" });
  if (isActive !== undefined && typeof isActive !== "boolean") return res.status(400).json({ error: "Active state must be a boolean", field: "isActive" });

  try {
    const existing = await prisma.user.findUnique({ where: { id }, select: { ...publicUserSelect } });
    if (!existing) return res.status(404).json({ error: "User not found" });
    if (email !== undefined) {
      const duplicate = await prisma.user.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" }, NOT: { id } }, select: { id: true } });
      if (duplicate) return res.status(409).json({ error: "A user with this email already exists", field: "email" });
    }
    if (req.user?.id === id && isActive === false) return res.status(409).json({ error: "You cannot deactivate your own account" });
    const wouldLeaveAdmin = existing.role === Role.ADMINISTRATOR && existing.isActive && (role !== undefined && role !== Role.ADMINISTRATOR || isActive === false);
    if (wouldLeaveAdmin) {
      const activeAdmins = await prisma.user.count({ where: { role: Role.ADMINISTRATOR, isActive: true } });
      if (activeAdmins <= 1) return res.status(409).json({ error: "The last active Administrator cannot be deactivated or reassigned" });
    }
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: publicUserSelect,
    });
    return res.json(serializeUser(user));
  } catch {
    return res.status(500).json({ error: "Failed to update user" });
  }
});

adminRouter.post("/users/:id/reset-password", async (req: Request, res: Response) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: "User not found" });
  const password = validatePassword(req.body?.newInitialPassword, "newInitialPassword");
  if (password.error) return res.status(400).json(password.error);
  try {
    const existing = await prisma.user.findUnique({ where: { id: Number(req.params.id) }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: "User not found" });
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash: await hashPassword(password.value!), mustChangePassword: true } });
    return res.json({ mustChangePassword: true });
  } catch {
    return res.status(500).json({ error: "Failed to reset password" });
  }
});

import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/lib/password.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();
const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}@example.com`;

describe("Lab 3 administrator user management", () => {
  it("searches users by partial name/email and filters by role", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true } });
    const response = await request(app).get("/api/admin/users?search=admin").set("Cookie", await loginAs(app, admin.email));
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.any(Array));
    expect(response.body.every((entry: { name: string; email: string }) => `${entry.name} ${entry.email}`.toLowerCase().includes("admin"))).toBe(true);

    const filtered = await request(app).get("/api/admin/users?role=IT_STAFF").set("Cookie", await loginAs(app, admin.email));
    expect(filtered.status).toBe(200);
    expect(filtered.body.length).toBeGreaterThan(0);
    expect(filtered.body.every((entry: { role: string }) => entry.role === "IT_STAFF")).toBe(true);
  });

  it("creates a user with a forced password change and rejects duplicate email", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true } });
    const cookie = await loginAs(app, admin.email);
    const email = uniqueEmail("admin-create");
    const created = await request(app).post("/api/admin/users").set("Cookie", cookie).send({ name: "Admin Created User", email, role: "REQUESTER", isActive: true, initialPassword: "TempPass1!" });
    expect(created.status).toBe(201);
    expect(created.body).toEqual(expect.objectContaining({ email, role: "REQUESTER", mustChangePassword: true }));
    expect(created.body.passwordHash).toBeUndefined();
    const duplicate = await request(app).post("/api/admin/users").set("Cookie", cookie).send({ name: "Duplicate", email: email.toUpperCase(), role: "IT_STAFF", isActive: true, initialPassword: "TempPass1!" });
    expect(duplicate.status).toBe(409);
    await prisma.user.delete({ where: { id: created.body.id } });
  });

  it("rejects invalid roles and persists user edits", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true } });
    const user = await prisma.user.create({ data: { name: "Admin Edit Fixture", email: uniqueEmail("admin-edit"), role: "REQUESTER", isActive: true, passwordHash: await hashPassword("DevPass123!"), mustChangePassword: false } });
    const cookie = await loginAs(app, admin.email);
    const invalid = await request(app).patch(`/api/admin/users/${user.id}`).set("Cookie", cookie).send({ role: "SUPPORT" });
    expect(invalid.status).toBe(400);
    const updated = await request(app).patch(`/api/admin/users/${user.id}`).set("Cookie", cookie).send({ name: "Edited User", email: user.email, role: "IT_STAFF", isActive: true });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual(expect.objectContaining({ name: "Edited User", role: "IT_STAFF", isActive: true }));
    const me = await request(app).get("/api/auth/me").set("Cookie", await loginAs(app, user.email));
    expect(me.status).toBe(200);
    expect(me.body).toEqual(expect.objectContaining({ id: user.id, role: "IT_STAFF", name: "Edited User" }));
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("resets a user's password and sets mustChangePassword", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true } });
    const user = await prisma.user.create({ data: { name: "Admin Reset Fixture", email: uniqueEmail("admin-reset"), role: "REQUESTER", isActive: true, passwordHash: "fixture", mustChangePassword: false } });
    const response = await request(app).post(`/api/admin/users/${user.id}/reset-password`).set("Cookie", await loginAs(app, admin.email)).send({ newInitialPassword: "ResetPass1!" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ mustChangePassword: true });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("blocks self-deactivation and preserves the last active administrator", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true } });
    const cookie = await loginAs(app, admin.email);
    const self = await request(app).patch(`/api/admin/users/${admin.id}`).set("Cookie", cookie).send({ isActive: false });
    expect(self.status).toBe(409);

    const temporary = await prisma.user.create({ data: { name: "Temporary Sole Admin", email: uniqueEmail("sole-admin"), role: "ADMINISTRATOR", isActive: true, passwordHash: await hashPassword("DevPass123!"), mustChangePassword: false } });
    const otherAdmins = await prisma.user.findMany({ where: { role: "ADMINISTRATOR", isActive: true, id: { notIn: [temporary.id] } }, select: { id: true, isActive: true } });
    await prisma.user.updateMany({ where: { id: { in: otherAdmins.map((entry) => entry.id) } }, data: { isActive: false } });
    try {
      const temporaryCookie = await loginAs(app, temporary.email);
      const blocked = await request(app).patch(`/api/admin/users/${temporary.id}`).set("Cookie", temporaryCookie).send({ role: "IT_STAFF" });
      expect(blocked.status).toBe(409);
      expect(blocked.body.error).toContain("last active Administrator");
    } finally {
      await prisma.user.updateMany({ where: { id: { in: otherAdmins.map((entry) => entry.id) } }, data: { isActive: true } });
      await prisma.user.delete({ where: { id: temporary.id } });
    }
  });

  it("returns 403 to Requesters and IT Staff and 404 for unknown users", async () => {
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true } });
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    expect((await request(app).get("/api/admin/users").set("Cookie", await loginAs(app, requester.email))).status).toBe(403);
    expect((await request(app).get("/api/admin/users").set("Cookie", await loginAs(app, staff.email))).status).toBe(403);
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true } });
    expect((await request(app).patch("/api/admin/users/999999/reset-password").set("Cookie", await loginAs(app, admin.email)).send({ newInitialPassword: "ResetPass1!" })).status).toBe(404);
  });

  it("keeps deactivated users in the list and has no delete route", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true } });
    const user = await prisma.user.create({ data: { name: "Admin Deactivation Fixture", email: uniqueEmail("admin-deactivate"), role: "REQUESTER", isActive: true, passwordHash: "fixture", mustChangePassword: true } });
    const cookie = await loginAs(app, admin.email);
    try {
      const deactivated = await request(app).patch(`/api/admin/users/${user.id}`).set("Cookie", cookie).send({ isActive: false });
      expect(deactivated.status).toBe(200);
      const listed = await request(app).get(`/api/admin/users?search=${encodeURIComponent(user.email)}`).set("Cookie", cookie);
      expect(listed.status).toBe(200);
      expect(listed.body).toEqual([expect.objectContaining({ id: user.id, isActive: false })]);
      const deleted = await request(app).delete(`/api/admin/users/${user.id}`).set("Cookie", cookie);
      expect([404, 405]).toContain(deleted.status);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});

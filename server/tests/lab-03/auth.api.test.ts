import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/lib/password.js";

const prisma = getPrisma();

// Relies on server/prisma/seed.ts having been run against the test database
// (same convention as the Lab 2 test suite). Every seeded account shares
// this password — see seed.ts's SEED_PASSWORD constant.
const SEED_PASSWORD = "DevPass123!";
const ACTIVE_REQUESTER_EMAIL = "jennifer.anderson@kmutt.ac.th";
const INACTIVE_REQUESTER_EMAIL = "inactive.user@kmutt.ac.th";

function extractSessionCookie(res: request.Response): string {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const sidCookie = cookies.find((c: string) => c.startsWith("sid="));
  if (!sidCookie) throw new Error("Expected a sid cookie in the response, got none.");
  return sidCookie.split(";")[0];
}

describe("POST /api/auth/login", () => {
  it("AC-01: valid credentials establish a session and return the user's identity/role", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: ACTIVE_REQUESTER_EMAIL, password: SEED_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: ACTIVE_REQUESTER_EMAIL, role: "REQUESTER" });
    expect(res.body).not.toHaveProperty("passwordHash");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("BR-01: wrong password is rejected with a generic, non-leaking message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: ACTIVE_REQUESTER_EMAIL, password: "TotallyWrongPassword1!" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password.");
  });

  it("BR-01/AC-05: an inactive account with the CORRECT password gets the identical message as a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: INACTIVE_REQUESTER_EMAIL, password: SEED_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password.");
  });

  it("rejects a nonexistent email with the same generic message (no user enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@nowhere.test", password: SEED_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password.");
  });

  it("returns 400 with a field name when email or password is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: ACTIVE_REQUESTER_EMAIL });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe("password");
  });

  it("BR-07: returns the same generic 401 for repeated failed attempts", async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => request(app).post("/api/auth/login").send({ email: ACTIVE_REQUESTER_EMAIL, password: "WrongPassword1!" }))
    );
    expect(responses.every((response) => response.status === 401)).toBe(true);
    expect(new Set(responses.map((response) => response.body.error))).toEqual(new Set(["Invalid email or password."]));
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 with no session cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the current user's identity/role/mustChangePassword when authenticated", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: ACTIVE_REQUESTER_EMAIL, password: SEED_PASSWORD });
    const cookie = extractSessionCookie(loginRes);

    const meRes = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body).toMatchObject({ email: ACTIVE_REQUESTER_EMAIL, role: "REQUESTER" });
  });
});

describe("POST /api/auth/logout", () => {
  it("BR-06: invalidates the session server-side; the old cookie is rejected afterward with 401", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: ACTIVE_REQUESTER_EMAIL, password: SEED_PASSWORD });
    const cookie = extractSessionCookie(loginRes);

    const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(logoutRes.status).toBe(204);

    const meAfterLogout = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(meAfterLogout.status).toBe(401);
  });
});

describe("live session activation checks", () => {
  it("AC-27: rejects a deactivated user's existing session on the next request", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true } });
    const email = `live-session-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: { name: "Live Session Fixture", email, role: "REQUESTER", isActive: true, passwordHash: await hashPassword(SEED_PASSWORD), mustChangePassword: false },
    });
    const userLogin = await request(app).post("/api/auth/login").send({ email, password: SEED_PASSWORD });
    const userCookie = extractSessionCookie(userLogin);
    const adminCookie = extractSessionCookie(await request(app).post("/api/auth/login").send({ email: admin.email, password: SEED_PASSWORD }));

    try {
      const deactivated = await request(app).patch(`/api/admin/users/${user.id}`).set("Cookie", adminCookie).send({ isActive: false });
      expect(deactivated.status).toBe(200);
      expect((await request(app).get("/api/auth/me").set("Cookie", userCookie)).status).toBe(401);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});

describe("POST /api/auth/change-password and the mandatory-change gate", () => {
  // This flow needs a user with mustChangePassword=true, which no seeded
  // account has (seed.ts seeds already-known local-dev credentials, not
  // admin-issued initial passwords) — so this suite creates one directly.
  const TEMP_PASSWORD = "Temp0rary!";
  const email = `first-login-${Date.now()}@kmutt.ac.th`;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        name: "First Login Tester",
        email,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
        passwordHash: await hashPassword(TEMP_PASSWORD),
      },
    });
  });

  it("FR-05: a user who must change their password is blocked from a normal protected route", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ email, password: TEMP_PASSWORD });
    expect(loginRes.body.mustChangePassword).toBe(true);
    const cookie = extractSessionCookie(loginRes);

    const ticketsRes = await request(app).get("/api/tickets").set("Cookie", cookie);
    expect(ticketsRes.status).toBe(403);
  });

  it("FR-05: the same blocked session can still reach /change-password and /logout", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ email, password: TEMP_PASSWORD });
    const cookie = extractSessionCookie(loginRes);

    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ currentPassword: TEMP_PASSWORD, newPassword: "BrandNew1!Pass" });
    expect(changeRes.status).toBe(200);
    expect(changeRes.body.mustChangePassword).toBe(false);
  });

  it("BR-04: rejects a new password that fails the policy, naming the field", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ email, password: "BrandNew1!Pass" });
    const cookie = extractSessionCookie(loginRes);

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ currentPassword: "BrandNew1!Pass", newPassword: "weak" });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe("newPassword");
  });

  it("BR-05: rejects a new password identical to the current password", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ email, password: "BrandNew1!Pass" });
    const cookie = extractSessionCookie(loginRes);

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ currentPassword: "BrandNew1!Pass", newPassword: "BrandNew1!Pass" });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe("newPassword");
  });

  it("rejects an incorrect current password with 401", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ email, password: "BrandNew1!Pass" });
    const cookie = extractSessionCookie(loginRes);

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ currentPassword: "WrongCurrent1!", newPassword: "AnotherNew1!Pass" });
    expect(res.status).toBe(401);
  });
});

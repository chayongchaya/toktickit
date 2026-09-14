import request from "supertest";
import type { Express } from "express";

// Every Lab 2 test file needs to authenticate before hitting a now-protected
// /api/tickets or /api/attachments route (requireAuth in app.ts). This
// helper centralizes that so each test file doesn't reinvent cookie
// extraction. Assumes server/prisma/seed.ts has already been run against
// the test database — see SEED_PASSWORD there.
export const SEED_PASSWORD = "DevPass123!";

export async function loginAs(app: Express, email: string): Promise<string> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: SEED_PASSWORD });

  if (res.status !== 200) {
    throw new Error(
      `loginAs(${email}) failed with status ${res.status}: ${JSON.stringify(res.body)}`
    );
  }

  const raw = res.headers["set-cookie"];
  const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const sidCookie = cookies.find((c) => c.startsWith("sid="));
  if (!sidCookie) {
    throw new Error(`loginAs(${email}) succeeded but no sid cookie was set.`);
  }
  return sidCookie.split(";")[0];
}

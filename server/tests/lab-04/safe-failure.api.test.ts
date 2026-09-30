import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

describe("Lab 4 safe failure behavior", () => {
  afterEach(() => vi.restoreAllMocks());

  it("SAFE-01: hides database errors behind a generic Actions Taken response", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true, mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } } });
    const ticket = await prisma.ticket.findFirstOrThrow();
    vi.spyOn(prisma.ticket, "findUnique").mockRejectedValueOnce(new Error("simulated database failure"));
    const response = await request(app)
      .post(`/api/staff/tickets/${ticket.id}/actions`)
      .set("Cookie", await loginAs(app, staff.email))
      .send({ description: "Safe failure", result: "Should not expose internals", followUpRequired: false });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to create action taken" });
    expect(JSON.stringify(response.body)).not.toContain("simulated database failure");
    expect(JSON.stringify(response.body)).not.toContain("stack");
  });
});

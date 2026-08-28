import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/requesters", () => {
  it("should return 200 OK and an array of active requesters", async () => {
    const res = await request(app).get("/api/requesters");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    // ตรวจสอบโครงสร้าง field และต้องไม่มี Inactive User ปนมา
    res.body.forEach((user: { id: number; name: string; email: string; isActive: boolean }) => {
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("email");
      expect(user.isActive).toBe(true);
      expect(user.name).not.toBe("Inactive Tester");
    });
  });
});
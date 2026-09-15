import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/lib/password.js";

describe("password hashing", () => {
  it("stores passwords as bcrypt hashes and salts each hash", async () => {
    const plainText = "KnownPassword1!";
    const first = await hashPassword(plainText);
    const second = await hashPassword(plainText);

    expect(first).toMatch(/^\$2[aby]?\$/);
    expect(first).not.toBe(plainText);
    expect(second).not.toBe(first);
    await expect(verifyPassword(plainText, first)).resolves.toBe(true);
    await expect(verifyPassword("WrongPassword1!", first)).resolves.toBe(false);
  });
});

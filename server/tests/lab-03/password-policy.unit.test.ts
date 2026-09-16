import { describe, expect, it } from "vitest";
import { validatePasswordPolicy } from "../../src/lib/password.js";

describe("validatePasswordPolicy", () => {
  it("rejects each missing password rule", () => {
    expect(validatePasswordPolicy("Ab1!").failedRules).toContain("at least 8 characters");
    expect(validatePasswordPolicy("ABCDEFG1!").failedRules).toContain("a lowercase letter");
    expect(validatePasswordPolicy("abcdefg1!").failedRules).toContain("an uppercase letter");
    expect(validatePasswordPolicy("Abcdefgh!").failedRules).toContain("a number");
    expect(validatePasswordPolicy("Abcdefg1").failedRules).toContain("a special character");
  });

  it("accepts a password containing all required rules", () => {
    expect(validatePasswordPolicy("ValidPass1!")).toEqual({ valid: true, failedRules: [] });
  });
});

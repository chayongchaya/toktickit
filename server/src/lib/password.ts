import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function verifyPassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

// BR-04's password policy: at least 8 characters, upper + lower case,
// a number, and a special character. Mirrors the four-row checklist in
// ui-spec.md §2.1 exactly, so client and server never disagree about what
// "meets the policy" means.
export interface PasswordPolicyResult {
  valid: boolean;
  failedRules: string[];
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const failedRules: string[] = [];

  if (password.length < 8) failedRules.push("at least 8 characters");
  if (!/[a-z]/.test(password)) failedRules.push("a lowercase letter");
  if (!/[A-Z]/.test(password)) failedRules.push("an uppercase letter");
  if (!/[0-9]/.test(password)) failedRules.push("a number");
  if (!/[^A-Za-z0-9]/.test(password)) failedRules.push("a special character");

  return { valid: failedRules.length === 0, failedRules };
}

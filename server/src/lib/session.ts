import { randomBytes } from "crypto";

// In-memory session store, acceptable for this course stack per
// specification.md §8 ("in-memory/DB-backed session store for this course
// stack"). This keeps the session id itself meaningless to the client (an
// opaque random token, not a JWT the client could decode or forge) and
// makes logout a real server-side invalidation (BR-06) rather than a
// client-side no-op.
//
// Known limitation, intentionally accepted for a course lab: sessions do not
// survive a server restart and are not shared across multiple server
// processes. If this is ever deployed behind more than one Node process,
// swap this Map for a shared store (e.g. a Prisma-backed Session table or
// Redis) without changing this module's exported function signatures.

const SESSION_IDLE_MS = 8 * 60 * 60 * 1000; // 8 hours, per api-spec.md §1.2

interface SessionRecord {
  userId: number;
  expiresAt: number;
}

const sessions = new Map<string, SessionRecord>();

export function createSession(userId: number): string {
  const sessionId = randomBytes(32).toString("hex");
  sessions.set(sessionId, { userId, expiresAt: Date.now() + SESSION_IDLE_MS });
  return sessionId;
}

// Returns the session's userId if the session exists and hasn't idled out,
// and slides the expiration forward (idle expiration, not absolute) as a
// side effect. Returns null for a missing or expired session — the caller
// cannot distinguish "never existed" from "expired," which is fine here
// since both cases mean the same thing to the client: log in again.
export function touchSession(sessionId: string): number | null {
  const record = sessions.get(sessionId);
  if (!record) return null;
  if (record.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  record.expiresAt = Date.now() + SESSION_IDLE_MS;
  return record.userId;
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
}

export const SESSION_COOKIE_NAME = "sid";
export const SESSION_MAX_AGE_MS = SESSION_IDLE_MS;

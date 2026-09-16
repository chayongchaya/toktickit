import dotenv from "dotenv";

// Loaded via vitest.config.ts's setupFiles, BEFORE any test file (and
// therefore before any getPrisma()/PrismaClient() call) runs.
//
// override: true is required here: Prisma Client has its own implicit
// .env-loading behavior that may have already populated
// process.env.DATABASE_URL from the dev .env by the time this file runs.
// Without override: true, dotenv.config() refuses to overwrite an
// already-set variable, and tests would silently keep hitting the dev
// database -- which is exactly how test-generated tickets like
// "TKT-...-UPL" ended up visible in the real app's UI.
dotenv.config({ path: ".env.test", override: true });

if (!process.env.DATABASE_URL?.includes("_test")) {
  // Fail loudly rather than silently running tests against what might be
  // the dev database. Adjust or remove this check if your test database
  // is intentionally named differently.
  throw new Error(
    "DATABASE_URL does not look like a test database (expected the name to contain \"_test\"). " +
      "Refusing to run tests against what might be your dev database. " +
      "Check server/.env.test exists and points at a separate database."
  );
}

-- Lab 3 migration: evolves Lab 2's RequesterUser into the real User model
-- (specification.md §7, §5.2 of the handout). Written by hand rather than
-- accepting Prisma's default destructive diff, because a naive diff would
-- DROP TABLE "RequesterUser" and CREATE TABLE "User", losing every existing
-- Requester and orphaning every Ticket.requesterId foreign key.
--
-- Order matters: enum changes must run before they are referenced by new
-- columns; the table rename must run before new NOT NULL columns are added
-- to it, so existing rows get a value via DEFAULT instead of failing.

-- 1. New enums -----------------------------------------------------------
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- Postgres requires ADD VALUE outside an explicit multi-statement
-- transaction block on some versions; if your migration runner wraps this
-- file in a single transaction and errors here, split these four lines
-- into their own migration file and re-run `prisma migrate deploy`.
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- 2. Rename RequesterUser -> User, in place ------------------------------
-- This preserves the table's data and its OID, so every existing foreign
-- key pointing at it (Ticket.requesterId) keeps working with zero data loss.
ALTER TABLE "RequesterUser" RENAME TO "User";
ALTER TABLE "User" RENAME CONSTRAINT "RequesterUser_pkey" TO "User_pkey";
ALTER INDEX "RequesterUser_email_key" RENAME TO "User_email_key";

-- 3. New User columns -----------------------------------------------------
-- passwordHash has no safe default; every pre-existing row gets a single,
-- documented local-dev placeholder hash (see seed.ts's MIGRATED_USER_HASH
-- comment for the literal password this corresponds to), and
-- mustChangePassword's DEFAULT true means every migrated Requester is
-- forced to set a real password at first login (handout §5.2).
ALTER TABLE "User"
  ADD COLUMN "passwordHash"       TEXT NOT NULL DEFAULT '$2b$10$PLACEHOLDER_REPLACED_BY_SEED_SCRIPT_DO_NOT_USE_IN_PROD',
  ADD COLUMN "role"               "Role" NOT NULL DEFAULT 'REQUESTER',
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;

CREATE INDEX "User_role_idx" ON "User"("role");

-- 4. Ticket changes ---------------------------------------------------------
ALTER TABLE "Ticket"
  ADD COLUMN "ownerId"                 INTEGER,
  ADD COLUMN "problemAppearsResolved"  BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");
CREATE INDEX "Ticket_currentStatus_idx" ON "Ticket"("currentStatus");

-- 5. New comment/note tables -------------------------------------------------
CREATE TABLE "PublicComment" (
  "id"        SERIAL PRIMARY KEY,
  "ticketId"  INTEGER NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "authorId"  INTEGER NOT NULL REFERENCES "User"("id"),
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PublicComment_ticketId_idx" ON "PublicComment"("ticketId");

CREATE TABLE "InternalNote" (
  "id"        SERIAL PRIMARY KEY,
  "ticketId"  INTEGER NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "authorId"  INTEGER NOT NULL REFERENCES "User"("id"),
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "InternalNote_ticketId_idx" ON "InternalNote"("ticketId");

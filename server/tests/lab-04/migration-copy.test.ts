import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const copyUrl = process.env.MIGRATION_COPY_URL;
const prisma = copyUrl
  ? new PrismaClient({ datasources: { db: { url: copyUrl } } })
  : null;

const expectedCounts = {
  User: Number(process.env.MIGRATION_COPY_USER_COUNT ?? -1),
  Ticket: Number(process.env.MIGRATION_COPY_TICKET_COUNT ?? -1),
  Attachment: Number(process.env.MIGRATION_COPY_ATTACHMENT_COUNT ?? -1),
  PublicComment: Number(process.env.MIGRATION_COPY_PUBLIC_COMMENT_COUNT ?? -1),
  InternalNote: Number(process.env.MIGRATION_COPY_INTERNAL_NOTE_COUNT ?? -1),
};

describe.skipIf(!prisma)("Lab 4 migration DB-copy evidence", () => {
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("MIGRATION-01: preserves Lab 3 row counts after the additive migration", async () => {
    const [users, tickets, attachments, publicComments, internalNotes] = await Promise.all([
      prisma!.user.count(),
      prisma!.ticket.count(),
      prisma!.attachment.count(),
      prisma!.publicComment.count(),
      prisma!.internalNote.count(),
    ]);

    expect({ User: users, Ticket: tickets, Attachment: attachments, PublicComment: publicComments, InternalNote: internalNotes })
      .toEqual(expectedCounts);
    const migrations = await prisma!.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE migration_name = '20260928000000_lab4_actions_taken'
        AND finished_at IS NOT NULL
    `;
    expect(migrations).toHaveLength(1);
  });

  it("MIGRATION-02: keeps a legacy ticket valid with an empty Actions Taken list", async () => {
    const ticket = await prisma!.ticket.findFirstOrThrow({
      select: { id: true, actionsTaken: { select: { id: true } } },
    });
    expect(ticket.actionsTaken).toEqual([]);
  });
});

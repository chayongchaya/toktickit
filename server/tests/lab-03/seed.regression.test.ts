import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { getPrisma } from "../../src/prisma.js";

const execFileAsync = promisify(execFile);
const prisma = getPrisma();
const serverRoot = path.resolve(process.cwd());

async function runSeed() {
  const tsxCli = path.join(serverRoot, "node_modules", "tsx", "dist", "cli.mjs");
  await execFileAsync(process.execPath, [tsxCli, "prisma/seed.ts"], { cwd: serverRoot, timeout: 30_000 });
}

async function counts() {
  const seedTicketNumbers = Array.from({ length: 8 }, (_, index) => `TKT-2026-${String(index + 1).padStart(6, "0")}`);
  const seedTickets = await prisma.ticket.findMany({ where: { ticketNumber: { in: seedTicketNumbers } }, select: { id: true } });
  const seedTicketIds = seedTickets.map((ticket) => ticket.id);
  const [users, tickets, comments, notes, attachments] = await Promise.all([
    prisma.user.count({ where: { email: { in: [
      "jennifer.anderson@kmutt.ac.th", "michael.brown@kmutt.ac.th", "sarah.johnson@kmutt.ac.th", "david.lee@kmutt.ac.th",
      "inactive.user@kmutt.ac.th", "kevin.patel@tiktockit.com", "emily.davis@tiktockit.com", "lisa.martinez@tiktockit.com",
      "robert.wilson@tiktockit.com", "john.smith@tiktockit.com",
    ] } } }),
    prisma.ticket.count({ where: { ticketNumber: { in: seedTicketNumbers } } }),
    prisma.publicComment.count({ where: { ticketId: { in: seedTicketIds }, content: { in: [
      "Just adding that this happens even when I close all applications.",
      "We are investigating the issue on your device. We'll update you shortly.",
      "Still can't connect this morning either — same error message as before.",
    ] } } }),
    prisma.internalNote.count({ where: { ticketId: { in: seedTicketIds }, content: { in: [
      "Checked event logs; battery driver crashed twice this week. Escalating to hardware vendor.",
      "Confirmed VPN gateway cert expired for this user's group; renewal ticket filed with network team.",
    ] } } }),
    prisma.attachment.count({ where: { ticketId: { in: seedTicketIds } } }),
  ]);
  return { users, tickets, comments, notes, attachments };
}

describe("Lab 3 seed regression", () => {
  it("is idempotent when run twice", async () => {
    await runSeed();
    const afterFirstSeed = await counts();
    await runSeed();
    expect(await counts()).toEqual(afterFirstSeed);
  }, 70_000);
});

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

async function actionCounts() {
  const tickets = await prisma.ticket.findMany({
    where: { ticketNumber: { in: ["TKT-2026-000001", "TKT-2026-000002", "TKT-2026-000003", "TKT-2026-000004"] } },
    select: { ticketNumber: true, id: true },
  });
  const counts = await Promise.all(tickets.map(async (ticket) => [ticket.ticketNumber, await prisma.actionTaken.count({ where: { ticketId: ticket.id } })] as const));
  return Object.fromEntries(counts);
}

describe("Lab 4 migration and seed safety", () => {
  it("MIGRATION-03: seed is idempotent and covers zero, one, and multiple Actions Taken", async () => {
    await runSeed();
    const first = await actionCounts();
    await runSeed();
    expect(await actionCounts()).toEqual(first);
    expect(first["TKT-2026-000001"]).toBe(0);
    expect(first["TKT-2026-000002"]).toBe(1);
    expect(first["TKT-2026-000003"]).toBeGreaterThan(1);
  }, 70_000);
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const projectRoot = path.resolve(process.cwd(), "..");

describe("Lab 3 migration and regression checks", () => {
  it("MIG-01: preserves requester relations for seeded tickets", async () => {
    const tickets = await prisma.ticket.findMany({ select: { requesterId: true, requester: { select: { id: true, role: true } } } });
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets.every((ticket) => ticket.requester.id === ticket.requesterId && ticket.requester.role === "REQUESTER")).toBe(true);
  });

  it("MIG-02: has no reachable RequesterContext or selector imports", () => {
    const clientRoot = path.join(projectRoot, "client", "src");
    const sourceFiles: string[] = [];
    const visit = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(fullPath);
        else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(fullPath);
      }
    };
    visit(clientRoot);
    const source = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/from\s+["'][^"']*RequesterContext/);
    expect(source).not.toMatch(/from\s+["'][^"']*SelectRequesterPage/);
  });

  it("MIG-03: retains the authenticated Lab 2 requester regression suites", () => {
    for (const file of ["tickets.create.test.ts", "attachments.api.test.ts", "my-tickets.api.test.ts", "ticket-detail.api.test.ts"]) {
      expect(fs.existsSync(path.join(projectRoot, "server", "tests", "lab-02", file))).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();
const projectRoot = path.resolve(process.cwd(), "..");

describe("Lab 3 migration and regression checks", () => {
  it("MIG-01: preserves requester relations for seeded tickets", async () => {
    const [tickets, ticketCount, attachments] = await Promise.all([
      prisma.ticket.findMany({ select: { requesterId: true, requester: { select: { id: true, role: true } } } }),
      prisma.ticket.count(),
      prisma.attachment.findMany({ select: { ticketId: true } }),
    ]);
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets.length).toBe(ticketCount);
    expect(tickets.every((ticket) => ticket.requester.id === ticket.requesterId && ticket.requester.role === "REQUESTER")).toBe(true);
    const ticketIds = new Set((await prisma.ticket.findMany({ select: { id: true } })).map((ticket) => ticket.id));
    expect(attachments.every((attachment) => ticketIds.has(attachment.ticketId))).toBe(true);
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

  it("MIG-03: retains the authenticated Lab 2 requester regression suites", async () => {
    for (const file of ["tickets.create.test.ts", "attachments.api.test.ts", "my-tickets.api.test.ts", "ticket-detail.api.test.ts"]) {
      expect(fs.existsSync(path.join(projectRoot, "server", "tests", "lab-02", file))).toBe(true);
    }

    const requester = await prisma.user.findUniqueOrThrow({ where: { email: "jennifer.anderson@kmutt.ac.th" } });
    const otherRequester = await prisma.user.findUniqueOrThrow({ where: { email: "michael.brown@kmutt.ac.th" } });
    const ownTicket = await prisma.ticket.findFirstOrThrow({ where: { requesterId: requester.id } });
    const foreignTicket = await prisma.ticket.findFirstOrThrow({ where: { requesterId: otherRequester.id } });
    const cookie = await loginAs(app, requester.email);

    const list = await request(app).get("/api/tickets").set("Cookie", cookie);
    expect(list.status).toBe(200);
    expect(list.body.data.every((ticket: { requesterId: number }) => ticket.requesterId === requester.id)).toBe(true);

    const detail = await request(app).get(`/api/tickets/${ownTicket.id}`).set("Cookie", cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.requesterId).toBe(requester.id);

    const foreignDetail = await request(app).get(`/api/tickets/${foreignTicket.id}`).set("Cookie", cookie);
    expect(foreignDetail.status).toBe(404);
  });
});

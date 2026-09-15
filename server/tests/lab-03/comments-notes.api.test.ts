import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

describe("Lab 3 comments and internal notes", () => {
  it("lets staff post a public comment visible to the requester", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true } });
    const ticket = await prisma.ticket.findFirstOrThrow({ where: { requesterId: requester.id } });
    const content = `staff comment ${Date.now()}`;
    const created = await request(app).post(`/api/tickets/${ticket.id}/comments`).set("Cookie", await loginAs(app, staff.email)).send({ content, authorId: requester.id, createdAt: "2000-01-01T00:00:00.000Z" });
    expect(created.status).toBe(201);
    expect(created.body.content).toBe(content);
    expect(created.body.author.id).toBe(staff.id);
    const visible = await request(app).get(`/api/tickets/${ticket.id}/comments`).set("Cookie", await loginAs(app, requester.email));
    expect(visible.status).toBe(200);
    expect(visible.body.some((comment: { content: string }) => comment.content === content)).toBe(true);
  });

  it("rejects empty and overlong comments or notes", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const ticket = await prisma.ticket.findFirstOrThrow();
    const cookie = await loginAs(app, staff.email);
    for (const content of ["   ", "x".repeat(2001)]) {
      expect((await request(app).post(`/api/tickets/${ticket.id}/comments`).set("Cookie", cookie).send({ content })).status).toBe(400);
      expect((await request(app).post(`/api/staff/tickets/${ticket.id}/notes`).set("Cookie", cookie).send({ content })).status).toBe(400);
    }
  });

  it("uses session author data and keeps comments/notes append-only", async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    const ticket = await prisma.ticket.findFirstOrThrow();
    const cookie = await loginAs(app, staff.email);
    const content = `append-only ${Date.now()}`;
    const note = await request(app).post(`/api/staff/tickets/${ticket.id}/notes`).set("Cookie", cookie).send({ content, authorId: 999999, createdAt: "2000-01-01T00:00:00.000Z" });
    expect(note.status).toBe(201);
    expect(note.body.author.id).toBe(staff.id);
    expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/notes/${note.body.id}`).set("Cookie", cookie).send({ content: "changed" })).status).toBe(404);
    expect((await request(app).delete(`/api/staff/tickets/${ticket.id}/notes/${note.body.id}`).set("Cookie", cookie)).status).toBe(404);
  });
});

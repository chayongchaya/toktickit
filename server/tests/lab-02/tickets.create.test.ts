import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs } from "../helpers/auth.js";

const prisma = getPrisma();

// Lab 3: every /api/tickets call below now needs a session cookie
// (requireAuth in app.ts) instead of a requesterId body/query param.
// getRandomActiveRequester() picks a fresh active Requester and logs in as
// them per-test, since RequesterUser (Requester-only) was renamed to User
// (all three roles) -- the role filter is required so these tests never
// accidentally pick an IT Staff/Administrator row.
async function getRandomActiveRequester() {
  const requester = await prisma.user.findFirst({ where: { isActive: true, role: "REQUESTER", mustChangePassword: false, email: { not: "jennifer.anderson@kmutt.ac.th" }, NOT: { email: { startsWith: "first-login-" } } }, orderBy: { id: "asc" } });
  const cookie = await loginAs(app, requester!.email);
  return { requester: requester!, cookie };
}

describe("POST /api/tickets & GET /api/systems", () => {
  it("GET /api/systems should return 200 and active systems", async () => {
    const res = await request(app).get("/api/related-systems");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /api/tickets should return 401 with no session", async () => {
    // Lab 3: an unauthenticated request is rejected before validation ever
    // runs (FR-07 step 1) -- this replaces the old "missing requesterId ->
    // 400" case, since requesterId is no longer a client-supplied field at
    // all.
    const res = await request(app).post("/api/tickets").send({});
    expect(res.status).toBe(401);
  });

  it("POST /api/tickets should return 400 when summary or description is missing", async () => {
    const { cookie } = await getRandomActiveRequester();
    const res = await request(app).post("/api/tickets").set("Cookie", cookie).send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/tickets should create ticket with status NEW", async () => {
    const { cookie } = await getRandomActiveRequester();
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const payload = {
      categoryId: category!.id,
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
      summary: "Cannot access internal VPN",
      description: "Getting timeout error when trying to connect to university VPN network.",
    };

    const res = await request(app).post("/api/tickets").set("Cookie", cookie).send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("ticketNumber");
    expect(res.body.currentStatus).toBe("NEW");
  });

  it("GET /api/tickets/:id should return ticket details by ID for the owning requester", async () => {
    const { requester, cookie } = await getRandomActiveRequester();
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const created = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}-DTL`,
        requesterId: requester.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "NEW",
        summary: "Detail Test Ticket",
        description: "Detail description test",
      },
    });

    const res = await request(app).get(`/api/tickets/${created.id}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", created.id);
    expect(res.body).toHaveProperty("summary");
  });

  it("GET /api/tickets/:id should return 401 with no session", async () => {
    // Lab 3: replaces the old "missing requesterId -> 400". There is no
    // longer a requesterId query param to omit -- the only way to be
    // unidentified now is to have no session at all, which is 401
    // (FR-07 step 1), checked before the ticket lookup even runs.
    const existingTicket = await prisma.ticket.findFirst();
    if (existingTicket) {
      const res = await request(app).get(`/api/tickets/${existingTicket.id}`);
      expect(res.status).toBe(401);
    }
  });

  it("GET /api/tickets/:id should return 404 when requester does not own the ticket (Lab 3: existence-hiding, not 403)", async () => {
    const requesters = await prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER", mustChangePassword: false, NOT: { email: { startsWith: "first-login-" } } },
      take: 2,
    });
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const owner = requesters[0];
    const other = requesters[1];
    const otherCookie = await loginAs(app, other.email);

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}-OWN`,
        requesterId: owner.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "NEW",
        summary: "Forbidden Test Ticket",
        description: "Forbidden description test",
      },
    });

    // Lab 3 (FR-07/AC-28): 404, not 403 -- a ticket that exists but isn't
    // yours must be indistinguishable from a ticket id that doesn't exist.
    const res = await request(app).get(`/api/tickets/${ticket.id}`).set("Cookie", otherCookie);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/tickets/:id should return 404 for non-existent ticket ID", async () => {
    const { cookie } = await getRandomActiveRequester();
    const res = await request(app).get("/api/tickets/999999").set("Cookie", cookie);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/tickets should return 400 for an invalid requestedPriority value", async () => {
    const { cookie } = await getRandomActiveRequester();
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const res = await request(app).post("/api/tickets").set("Cookie", cookie).send({
      categoryId: category!.id,
      relatedSystemId: system!.id,
      requestedPriority: "URGENT", // not a valid Priority enum value
      summary: "Invalid priority test",
      description: "Sending an unsupported priority value to the API.",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/tickets should return 400 (not 500) for a non-numeric categoryId", async () => {
    const { cookie } = await getRandomActiveRequester();
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app).post("/api/tickets").set("Cookie", cookie).send({
      categoryId: "abc",
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
      summary: "Non-numeric category ID test",
      description: "Sending a non-numeric categoryId must not crash into a 500.",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/tickets should return 400 for a non-existent categoryId", async () => {
    const { cookie } = await getRandomActiveRequester();
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app).post("/api/tickets").set("Cookie", cookie).send({
      categoryId: 999999,
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
      summary: "Invalid category test",
      description: "Sending a categoryId that does not exist.",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/tickets should return 400 for a non-existent relatedSystemId", async () => {
    const { cookie } = await getRandomActiveRequester();
    const category = await prisma.category.findFirst();

    const res = await request(app).post("/api/tickets").set("Cookie", cookie).send({
      categoryId: category!.id,
      relatedSystemId: 999999,
      requestedPriority: "MEDIUM",
      summary: "Invalid related system test",
      description: "Sending a relatedSystemId that does not exist.",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  // Lab 3: the old "inactive requester (AC-11)" and "nonexistent requesterId"
  // tests that lived here are structurally obsolete -- there is no longer
  // any requesterId field on this request at all (BR-03). Their scenarios
  // are now covered elsewhere under their Lab 3 test IDs:
  //   - an inactive account cannot authenticate in the first place:
  //     server/tests/lab-03/auth.api.test.ts (BR-01)
  //   - "client-supplied id is ignored / existence-hiding" style checks:
  //     server/tests/lab-03/authorization.api.test.ts (AC-03, AC-28)
  // Note also that Lab 3's own AC-11 now means something unrelated ("Admin
  // cannot deactivate their own account") -- reusing that label here would
  // have been actively misleading, not just redundant.

  it("POST /api/tickets should reject an immediate resubmission of the same ticket with 409", async () => {
    const { cookie } = await getRandomActiveRequester();
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const payload = {
      categoryId: category!.id,
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
      summary: `Duplicate submission test ${Date.now()}`,
      description: "Submitting this exact same ticket twice in a row should be blocked.",
    };

    const first = await request(app).post("/api/tickets").set("Cookie", cookie).send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/tickets").set("Cookie", cookie).send(payload);
    expect(second.status).toBe(409);
    expect(second.body).toHaveProperty("error");
  });

  it("POST /api/tickets should copy itPriority from requestedPriority at creation (Lab 3 fix -- BR-14)", async () => {
    // Lab 2 had a bug here: itPriority was hardcoded to MEDIUM regardless of
    // what the Requester submitted. BR-14 requires it to copy
    // requestedPriority at creation time instead -- see api-spec.md §0.
    const { cookie } = await getRandomActiveRequester();
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const res = await request(app).post("/api/tickets").set("Cookie", cookie).send({
      categoryId: category!.id,
      relatedSystemId: system!.id,
      requestedPriority: "HIGH",
      summary: `itPriority copy test ${Date.now()}`,
      description: "Requested priority is HIGH; IT priority must copy it at creation.",
    });

    expect(res.status).toBe(201);
    expect(res.body.requestedPriority).toBe("HIGH");
    expect(res.body.itPriority).toBe("HIGH");
  });

  it("GET /api/tickets should filter by itPriority", async () => {
    const { requester, cookie } = await getRandomActiveRequester();
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}-ITP`,
        requesterId: requester.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "HIGH",
        currentStatus: "NEW",
        summary: "IT Priority filter test",
        description: "Ticket created to verify itPriority query filtering.",
      },
    });

    const res = await request(app).get(`/api/tickets?itPriority=HIGH`).set("Cookie", cookie);

    expect(res.status).toBe(200);
    const tickets = res.body.data ?? res.body.tickets;
    expect(Array.isArray(tickets)).toBe(true);
    for (const t of tickets) {
      expect(t.itPriority).toBe("HIGH");
    }
  });

  it("API-02b: should return 400 for inactive category or related system", async () => {
    const { cookie } = await getRandomActiveRequester();

    let inactiveCategory = await prisma.category.findFirst({
      where: { isActive: false },
    });

    if (!inactiveCategory) {
      inactiveCategory = await prisma.category.create({
        data: {
          name: `Inactive category ${Date.now()}`,
          isActive: false,
        },
      });
    }

    const system = await prisma.relatedSystem.findFirst({
      where: { isActive: true },
    });

    const res = await request(app).post("/api/tickets").set("Cookie", cookie).send({
      categoryId: inactiveCategory.id,
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
      summary: `Inactive category test ${Date.now()}`,
      description: "Inactive category must be rejected.",
    });

    expect(res.status).toBe(400);
  });

  it("API-09: should create unique ticket numbers concurrently", async () => {
    const { cookie } = await getRandomActiveRequester();
    const category = await prisma.category.findFirst({
      where: { isActive: true },
    });
    const system = await prisma.relatedSystem.findFirst({
      where: { isActive: true },
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        request(app)
          .post("/api/tickets")
          .set("Cookie", cookie)
          .send({
            categoryId: category!.id,
            relatedSystemId: system!.id,
            requestedPriority: "MEDIUM",
            summary: `Concurrent ticket ${Date.now()}-${index}`,
            description: `Concurrency test ticket ${index}`,
          })
      )
    );
    const failures = results
      .map((res, index) => ({
        index,
        status: res.status,
        body: res.body,
      }))
      .filter((result) => result.status !== 201);

    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);

    const ticketNumbers = results.map(
      (res) =>
        res.body.ticketNumber ??
        res.body.ticket?.ticketNumber ??
        res.body.data?.ticketNumber
    );

    expect(ticketNumbers.every((number) => typeof number === "string")).toBe(true);

    for (const ticketNumber of ticketNumbers) {
      expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    }

    expect(new Set(ticketNumbers).size).toBe(ticketNumbers.length);
  });
});

import { describe, it, expect } from "vitest";
import { generateTicketNumber } from "../../src/routes/tickets";

// UNIT-01 (tests.md): Ticket Number generator produces the required
// TKT-YYYY-XXXXXX format. This is a true unit test — it calls the
// generator function directly, with no HTTP layer involved, so it can
// run without spinning up the Express app.
//
// Note: true concurrency-safety (no two tickets ever sharing the same
// official Ticket Number) is guaranteed by the database's unique
// constraint on `ticketNumber` plus the retry loop in
// createTicketWithUniqueNumber, and is exercised end-to-end by the
// concurrent-creation API test (API-09) rather than here — this unit
// test is scoped to the generator's own output shape.
describe("generateTicketNumber (unit)", () => {
  it("returns a string matching the TKT-YYYY-XXXXXX format", async () => {
    const ticketNumber = await generateTicketNumber();
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
  });

  it("uses the current calendar year as the YYYY segment", async () => {
    const ticketNumber = await generateTicketNumber();
    const currentYear = new Date().getFullYear().toString();
    const [, year] = ticketNumber.split("-");
    expect(year).toBe(currentYear);
  });

  it("zero-pads the sequence segment to 6 digits", async () => {
    const ticketNumber = await generateTicketNumber();
    const [, , sequence] = ticketNumber.split("-");
    expect(sequence).toHaveLength(6);
    expect(sequence).toMatch(/^\d{6}$/);
  });
});

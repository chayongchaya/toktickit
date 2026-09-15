import { describe, expect, it } from "vitest";
import { TICKET_STATUSES, TICKET_TRANSITIONS } from "../../src/lib/ticketTransitions.js";

describe("ticket status transition matrix", () => {
  it("matches BR-18 for all eight statuses", () => {
    expect(TICKET_STATUSES).toEqual(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"]);
    expect(TICKET_TRANSITIONS).toEqual({
      NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
      OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
      IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
      WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
      RESOLVED: ["CLOSED", "REOPENED"],
      CLOSED: ["REOPENED"],
      REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
      CANCELLED: [],
    });
  });
});

import { describe, expect, it } from "vitest";
import { buildActionTakenData, validateActionInput } from "../../src/routes/staff.js";

const valid = { description: "Checked the device", result: "Device is working", followUpRequired: false };

describe("Actions Taken validator", () => {
  it("UNIT-01: accepts valid input and trims are handled by the route", () => {
    expect(validateActionInput(valid)).toBeNull();
    expect(validateActionInput({ ...valid, followUpRequired: true, followUpNote: "Call requester" })).toBeNull();
  });

  it("UNIT-01: rejects required fields, length caps, and missing follow-up notes", () => {
    expect(validateActionInput({ ...valid, description: " " })?.field).toBe("description");
    expect(validateActionInput({ ...valid, result: " " })?.field).toBe("result");
    expect(validateActionInput({ ...valid, description: "x".repeat(2001) })?.field).toBe("description");
    expect(validateActionInput({ ...valid, result: "x".repeat(2001) })?.field).toBe("result");
    expect(validateActionInput({ ...valid, followUpRequired: true })?.field).toBe("followUpNote");
    expect(validateActionInput({ ...valid, followUpRequired: true, followUpNote: " " })?.field).toBe("followUpNote");
  });

  it("UNIT-02: maps actor and timestamp from server arguments, ignoring client-owned overrides", () => {
    const serverTime = new Date("2026-09-29T00:00:00.000Z");
    const mapped = buildActionTakenData(42, 7, { ...valid, performedById: 999999, actionDateTime: "2000-01-01T00:00:00.000Z" }, serverTime);
    expect(mapped.ticketId).toBe(42);
    expect(mapped.performedById).toBe(7);
    expect(mapped.actionDateTime).toBe(serverTime);
  });
});

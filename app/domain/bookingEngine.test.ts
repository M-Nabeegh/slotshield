import { describe, expect, it } from "vitest";
import { runScenario } from "./bookingEngine";

describe("runScenario", () => {
  it("confirms one booking and rejects the competing request in a race", () => {
    const report = runScenario("race");

    expect(report.finalState.confirmedBookings).toBe(1);
    expect(report.finalState.rejectedRequests).toBe(1);
  });

  it("cancels an expired hold before admitting a new booking", () => {
    const report = runScenario("expired-hold");

    expect(report.finalState.cancelledHolds).toBe(1);
    expect(report.finalState.confirmedBookings).toBe(1);
    expect(report.finalState.rejectedRequests).toBe(0);
  });

  it("ignores a duplicate payment callback after the booking is confirmed", () => {
    const report = runScenario("duplicate-callback");

    expect(report.finalState.confirmedBookings).toBe(1);
    expect(report.finalState.ignoredCallbacks).toBe(1);
  });

  it("rejects a client time-zone mismatch before a booking is created", () => {
    const report = runScenario("timezone");

    expect(report.finalState.confirmedBookings).toBe(0);
    expect(report.finalState.rejectedRequests).toBe(1);
  });
});

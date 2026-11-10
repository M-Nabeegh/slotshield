import { describe, expect, it } from "vitest";
import { allOff, allOn, formatClock, isoOffset, slotKey } from "./clinic";
import { simulate, totalIncidents } from "./engine";
import { scenarios } from "./scenarios";
import type { GuardrailId, ScenarioId } from "./types";

const only = (id: GuardrailId) => ({ ...allOff, [id]: true });

describe("opening-minute race", () => {
  it("double-books when the read decides and nothing guards the write", () => {
    const run = simulate("race", allOff);
    expect(run.summary.byType["double-booking"]).toBe(1);
    const tenOClock = run.snapshots.at(-1)!.filter(
      (booking) => slotKey(booking.provider, booking.slot) === "amin@600",
    );
    expect(tenOClock.map((booking) => booking.customer)).toEqual(["Hamza S.", "Ayesha R."]);
  });

  it("returns a conflict to the second writer with a unique constraint", () => {
    const run = simulate("race", only("slot-lock"));
    expect(totalIncidents(run.summary)).toBe(0);
    expect(run.summary.correctlyRefused).toBe(2);
    expect(run.events.some((event) => event.message.includes("409"))).toBe(true);
  });
});

describe("abandoned checkout", () => {
  it("turns patients away from a slot held by an expired, unpaid hold", () => {
    const run = simulate("expired-hold", allOff);
    expect(run.summary.byType["turned-away"]).toBe(2);
    expect(run.summary.byCause["hold-expiry"]).toBe(2);
  });

  it("releases the stale hold before checking availability", () => {
    const run = simulate("expired-hold", only("hold-expiry"));
    expect(totalIncidents(run.summary)).toBe(0);
    expect(run.events.some((event) => event.actor === "Hold sweeper")).toBe(true);
    const finalSlot = run.snapshots.at(-1)!.find(
      (booking) => booking.slot === 690 && booking.status === "confirmed",
    );
    expect(finalSlot?.customer).toBe("Saad Q.");
  });
});

describe("webhook retries", () => {
  it("captures the deposit again on every redelivery without idempotency", () => {
    const run = simulate("duplicate-callback", allOff);
    expect(run.summary.byType["charged-twice"]).toBe(3);
    const noor = run.snapshots.at(-1)!.find((booking) => booking.customer === "Noor F.");
    expect(noor?.confirmations).toBe(3);
  });

  it("acknowledges and skips events it has already processed", () => {
    const run = simulate("duplicate-callback", only("idempotency"));
    expect(totalIncidents(run.summary)).toBe(0);
    expect(run.events.filter((event) => event.outcome === "skipped")).toHaveLength(3);
  });
});

describe("patients abroad", () => {
  it("shifts appointments by the browser offset when times are not normalised", () => {
    const run = simulate("timezone", allOff);
    const fatima = run.snapshots.at(-1)!.find((booking) => booking.customer === "Fatima N.");
    expect(fatima).toMatchObject({ slot: 660, intendedSlot: 600 });
    expect(run.summary.byType["wrong-time"]).toBe(1);
    // London maps to 15:00 and Riyadh to 14:30, both outside clinic hours;
    // Kamran is blocked from 11:00 by Fatima's misplaced booking.
    expect(run.summary.byType["turned-away"]).toBe(3);
  });

  it("books everyone at the time they picked when times are read as clinic time", () => {
    const run = simulate("timezone", only("tz-normalize"));
    expect(totalIncidents(run.summary)).toBe(0);
    expect(run.summary.confirmed).toBe(4);
  });
});

describe("after the clocks change", () => {
  it("moves appointments by the hour a stale profile offset is off", () => {
    const run = simulate("clock-change", allOff);
    const farhan = run.snapshots.at(-1)!.find((booking) => booking.customer === "Farhan Y.");
    const rabia = run.snapshots.at(-1)!.find((booking) => booking.customer === "Rabia G.");
    // London fell back an hour, Sydney sprang forward.
    expect(farhan).toMatchObject({ slot: 540, intendedSlot: 600 });
    expect(rabia).toMatchObject({ slot: 750, intendedSlot: 690 });
    expect(run.summary.byType["wrong-time"]).toBe(2);
    // New York lands on 08:00, before the clinic opens; Taha finds 09:00 taken by Farhan.
    expect(run.summary.byType["turned-away"]).toBe(2);
    expect(run.summary.byCause["tz-normalize"]).toBe(4);
  });

  it("ignores the saved offset when times are read as clinic time", () => {
    const run = simulate("clock-change", only("tz-normalize"));
    expect(totalIncidents(run.summary)).toBe(0);
    expect(run.summary.confirmed).toBe(4);
  });
});

describe("cancellation and waitlist", () => {
  it("lets the fastest tap beat the longest wait, and overlapping claims double-book", () => {
    const run = simulate("waitlist", allOff);
    expect(run.summary.byType["passed-over"]).toBe(1);
    expect(run.summary.byType["double-booking"]).toBe(1);
    const halfTen = run.snapshots.at(-1)!.find(
      (booking) => slotKey(booking.provider, booking.slot) === "amin@630" && booking.status === "confirmed",
    );
    expect(halfTen?.customer).toBe("Yasir U.");
    expect(run.events.some((event) => event.message.includes("Laiba O. was ahead in line"))).toBe(true);
  });

  it("still passes the first patient over when only the unique constraint is on", () => {
    const run = simulate("waitlist", only("slot-lock"));
    expect(run.summary.byType["double-booking"]).toBe(0);
    expect(run.summary.byType["passed-over"]).toBe(1);
    // Adeel loses 09:45 to Sadia, who really was ahead of him.
    expect(run.events.some((event) => event.message.includes("ahead of Adeel S. on the waitlist"))).toBe(true);
  });

  it("hands each freed slot to the first patient in line", () => {
    const run = simulate("waitlist", only("waitlist-claim"));
    expect(totalIncidents(run.summary)).toBe(0);
    const final = run.snapshots.at(-1)!.filter((booking) => booking.status === "confirmed");
    expect(final.map((booking) => booking.customer).sort()).toEqual(["Hiba K.", "Laiba O.", "Sadia R."]);
    expect(run.events.filter((event) => event.actor === "Waitlist notifier")).toHaveLength(0);
  });
});

describe("every scenario", () => {
  it.each(scenarios.map((scenario) => scenario.id))("%s is clean with all guardrails on", (id: ScenarioId) => {
    const run = simulate(id, allOn, 8);
    expect(totalIncidents(run.summary)).toBe(0);
    expect(run.summary.affectedCustomers).toEqual([]);
  });

  it("keeps one snapshot per event", () => {
    for (const scenario of scenarios) {
      const run = simulate(scenario.id, allOff, 8);
      expect(run.snapshots).toHaveLength(run.events.length);
      expect(run.events.every((event, index) => event.index === index)).toBe(true);
    }
  });

  it("emits events in time order", () => {
    const run = simulate("rush-hour", allOff, 8);
    const times = run.events.map((event) => event.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});

describe("rush hour traffic", () => {
  it("is deterministic for a seed", () => {
    expect(simulate("rush-hour", allOff, 42).events).toEqual(simulate("rush-hour", allOff, 42).events);
  });

  it("changes with the seed", () => {
    expect(simulate("rush-hour", allOff, 42).requests).not.toEqual(simulate("rush-hour", allOff, 43).requests);
  });

  it("exercises the four booking and payment failures with the default seed", () => {
    const { byType } = simulate("rush-hour", allOff, 8).summary;
    for (const type of ["double-booking", "turned-away", "charged-twice", "wrong-time"] as const) {
      expect(byType[type]).toBeGreaterThan(0);
    }
  });

  it("attributes every incident to a guardrail that was off", () => {
    const run = simulate("rush-hour", { ...allOff, idempotency: true }, 8);
    for (const event of run.events) {
      for (const incident of event.incidents) {
        expect(run.guardrails[incident.cause]).toBe(false);
      }
    }
  });
});

describe("formatting", () => {
  it("formats the booking clock from 09:00", () => {
    expect(formatClock(0)).toBe("09:00:00.000");
    expect(formatClock(14 * 60_000 + 5_004)).toBe("09:14:05.004");
  });

  it("formats ISO offsets", () => {
    expect(isoOffset(240)).toBe("+04:00");
    expect(isoOffset(-300)).toBe("-05:00");
    expect(isoOffset(0)).toBe("+00:00");
  });
});

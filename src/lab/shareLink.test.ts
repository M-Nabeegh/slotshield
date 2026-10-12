import { describe, expect, it } from "vitest";
import { allOff } from "../engine/clinic";
import { setupFromHash, setupToHash } from "./shareLink";

describe("share links", () => {
  it("round-trips a setup", () => {
    const setup = {
      scenarioId: "rush-hour" as const,
      guardrails: { ...allOff, "slot-lock": true, idempotency: true },
      seed: 42,
    };
    const hash = setupToHash(setup);
    expect(hash).toBe("#/lab?traffic=rush-hour&seed=42&guardrails=slot-lock,idempotency");
    expect(setupFromHash(hash, 8)).toEqual(setup);
  });

  it("leaves the seed out for fixed traffic", () => {
    expect(setupToHash({ scenarioId: "race", guardrails: allOff, seed: 99 })).toBe("#/lab?traffic=race");
  });

  it("ignores unknown traffic, other pages, and junk seeds", () => {
    expect(setupFromHash("#/lab?traffic=nope", 8)).toBeNull();
    expect(setupFromHash("#/check?traffic=race", 8)).toBeNull();
    expect(setupFromHash("#/lab", 8)).toBeNull();
    expect(setupFromHash("#/lab?traffic=rush-hour&seed=-4&guardrails=evil", 8)).toEqual({
      scenarioId: "rush-hour",
      guardrails: allOff,
      seed: 8,
    });
  });
});

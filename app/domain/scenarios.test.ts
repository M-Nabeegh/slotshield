import { describe, expect, it } from "vitest";
import { scenarios } from "./scenarios";

describe("scenarios", () => {
  it("exposes the four public reliability simulations in a stable order", () => {
    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "race",
      "expired-hold",
      "duplicate-callback",
      "timezone",
    ]);
  });
});

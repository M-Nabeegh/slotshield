import { describe, expect, it } from "vitest";
import {
  normalizeStagingManifest,
  normalizeStagingResult,
  type ScenarioId,
} from "./stagingContract";

describe("normalizeStagingManifest", () => {
  it("accepts only a version-one test-only manifest", () => {
    expect(
      normalizeStagingManifest({
        contractVersion: 1,
        supports: ["race", "timezone", "unknown"],
        testOnly: true,
        secret: "must not escape",
      }),
    ).toEqual({
      contractVersion: 1,
      supports: ["race", "timezone"],
      testOnly: true,
    });
  });

  it("rejects a manifest that is not explicitly test-only", () => {
    expect(
      normalizeStagingManifest({
        contractVersion: 1,
        supports: ["race"],
        testOnly: false,
      }),
    ).toBeNull();
  });
});

describe("normalizeStagingResult", () => {
  it("normalizes supported fields and fills missing scenarios", () => {
    const requested: ScenarioId[] = ["race", "timezone"];

    expect(
      normalizeStagingResult(
        {
          status: "verified",
          scenarios: [
            { id: "race", status: "passed", evidence: "conflict returned" },
            { id: "expired-hold", status: "passed", evidence: "ignore this" },
          ],
          secret: "must not escape",
        },
        requested,
      ),
    ).toEqual({
      status: "verified",
      scenarios: [
        { id: "race", status: "passed", evidence: "conflict returned" },
        { id: "timezone", status: "not-tested", evidence: "No result returned." },
      ],
    });
  });

  it("turns an invalid adapter response into an attention result", () => {
    expect(normalizeStagingResult({ nope: true }, ["race"])).toEqual({
      status: "attention",
      scenarios: [
        { id: "race", status: "not-tested", evidence: "Adapter returned no supported results." },
      ],
    });
  });
});

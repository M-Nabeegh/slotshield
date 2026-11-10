import { afterEach, describe, expect, it, vi } from "vitest";
import { EXIT_FAILED, EXIT_OK, EXIT_USAGE, run } from "./run";

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (line: string) => out.push(line), err: (line: string) => err.push(line) } };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("slotshield simulate", () => {
  it("fails with exit code 1 and names the missing guardrail", async () => {
    const { out, io } = capture();
    const code = await run(["simulate", "--traffic", "race"], {}, io);
    expect(code).toBe(EXIT_FAILED);
    expect(out.join("\n")).toContain("Double booking");
    expect(out.join("\n")).toContain("slot-lock (1)");
  });

  it("passes when the guardrail is on", async () => {
    const { out, io } = capture();
    const code = await run(["simulate", "--traffic=race", "--guardrails", "slot-lock"], {}, io);
    expect(code).toBe(EXIT_OK);
    expect(out.at(-1)).toBe("No incidents.");
  });

  it("prints a machine-readable run with --json", async () => {
    const { out, io } = capture();
    const code = await run(["simulate", "--traffic", "waitlist", "--guardrails", "all", "--json"], {}, io);
    const parsed = JSON.parse(out.join("\n"));
    expect(code).toBe(EXIT_OK);
    expect(parsed.scenario).toBe("waitlist");
    expect(parsed.summary.byType["passed-over"]).toBe(0);
  });

  it("rejects unknown traffic, guardrails and seeds", async () => {
    expect(await run(["simulate", "--traffic", "nope"], {}, capture().io)).toBe(EXIT_USAGE);
    expect(await run(["simulate", "--guardrails", "nope"], {}, capture().io)).toBe(EXIT_USAGE);
    expect(await run(["simulate", "--seed", "0"], {}, capture().io)).toBe(EXIT_USAGE);
    expect(await run([], {}, capture().io)).toBe(EXIT_USAGE);
  });
});

describe("slotshield staging", () => {
  it("needs a URL and a token from the environment", async () => {
    expect(await run(["staging"], { SLOTSHIELD_TOKEN: "t" }, capture().io)).toBe(EXIT_USAGE);
    const { err, io } = capture();
    expect(await run(["staging", "--url", "https://staging.example.com"], {}, io)).toBe(EXIT_USAGE);
    expect(err.join("\n")).toContain("SLOTSHIELD_TOKEN");
  });

  it("passes when the adapter verifies every selected scenario", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${input}`);
      expect((init?.headers as Record<string, string>).authorization).toBe("Bearer test-token");
      if (input.endsWith("slotshield-test.json")) {
        return Response.json({ contractVersion: 1, supports: ["race", "timezone"], testOnly: true });
      }
      return Response.json({
        status: "verified",
        scenarios: [
          { id: "race", status: "passed", evidence: "Second claim returned 409." },
          { id: "timezone", status: "passed", evidence: "Stored as clinic time." },
        ],
      });
    });
    const { out, io } = capture();
    const code = await run(
      ["staging", "--url", "https://staging.example.com", "--scenarios", "race,timezone"],
      { SLOTSHIELD_TOKEN: "test-token" },
      io,
    );
    expect(code).toBe(EXIT_OK);
    expect(calls).toEqual([
      "GET https://staging.example.com/.well-known/slotshield-test.json",
      "POST https://staging.example.com/.well-known/slotshield-test/run",
    ]);
    expect(out.at(-1)).toBe("All selected scenarios passed.");
  });

  it("fails when a scenario needs attention or was not tested", async () => {
    vi.stubGlobal("fetch", async (input: string) =>
      input.endsWith("slotshield-test.json")
        ? Response.json({ contractVersion: 1, supports: ["race"], testOnly: true })
        : Response.json({
            status: "attention",
            scenarios: [{ id: "race", status: "attention", evidence: "Both claims succeeded." }],
          }));
    const { out, io } = capture();
    const code = await run(
      ["staging", "--url", "https://staging.example.com", "--scenarios", "race"],
      { SLOTSHIELD_TOKEN: "test-token" },
      io,
    );
    expect(code).toBe(EXIT_FAILED);
    expect(out.join("\n")).toContain("Both claims succeeded.");
  });

  it("refuses private addresses without calling them", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const code = await run(["staging", "--url", "http://127.0.0.1:3000"], { SLOTSHIELD_TOKEN: "t" }, capture().io);
    expect(code).toBe(EXIT_FAILED);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

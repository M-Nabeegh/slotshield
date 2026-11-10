import { allOff, allOn, formatClock, guardrails, incidentLabels } from "../src/engine/clinic";
import { simulate, totalIncidents } from "../src/engine/engine";
import { scenarios } from "../src/engine/scenarios";
import type { GuardrailId, Guardrails, IncidentType, ScenarioId } from "../src/engine/types";
import { handleStagingAudit } from "../server/stagingAudit";
import { SUPPORTED_SCENARIO_IDS, isScenarioId } from "../server/stagingContract";

export interface CliIo {
  out: (line: string) => void;
  err: (line: string) => void;
}

export const EXIT_OK = 0;
export const EXIT_FAILED = 1;
export const EXIT_USAGE = 2;

const USAGE = `slotshield <command> [options]

Commands
  simulate   Run a traffic pattern through the booking model
  staging    Run the test adapter on your own staging API
  scenarios  List traffic patterns and guardrails

simulate
  --traffic <id>        Traffic pattern (default: rush-hour)
  --seed <n>            Traffic number for seeded patterns (default: 8)
  --guardrails <list>   Comma-separated guardrail ids, or all / none (default: none)
  --events              Print every event, not only incidents
  --json                Print the full run as JSON

staging
  --url <https://...>   Staging base URL (required)
  --scenarios <list>    Comma-separated adapter scenarios (default: all)
  --json                Print the adapter result as JSON
  The token is read from the SLOTSHIELD_TOKEN environment variable.

Exit codes: 0 clean, 1 incidents or attention needed, 2 bad usage.`;

/** Runs the CLI and returns the process exit code. */
export async function run(
  argv: string[],
  env: Record<string, string | undefined>,
  io: CliIo,
): Promise<number> {
  const [command, ...rest] = argv;
  const flags = parseFlags(rest);
  if (!flags) {
    io.err(USAGE);
    return EXIT_USAGE;
  }

  if (command === "scenarios") {
    io.out("Traffic patterns");
    for (const scenario of scenarios) {
      io.out(`  ${scenario.id.padEnd(20)}${scenario.title}`);
    }
    io.out("");
    io.out("Guardrails");
    for (const guardrail of guardrails) {
      io.out(`  ${guardrail.id.padEnd(20)}${guardrail.name}`);
    }
    return EXIT_OK;
  }

  if (command === "simulate") {
    return runSimulate(flags, io);
  }

  if (command === "staging") {
    return runStaging(flags, env, io);
  }

  io.err(USAGE);
  return command === "help" || command === "--help" ? EXIT_OK : EXIT_USAGE;
}

type Flags = Map<string, string | true>;

function parseFlags(args: string[]): Flags | null {
  const flags: Flags = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      return null;
    }
    const [name, inline] = arg.slice(2).split("=", 2);
    if (inline !== undefined) {
      flags.set(name, inline);
    } else if (index + 1 < args.length && !args[index + 1].startsWith("--")) {
      flags.set(name, args[index + 1]);
      index += 1;
    } else {
      flags.set(name, true);
    }
  }
  return flags;
}

function text(flags: Flags, name: string): string | undefined {
  const value = flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function runSimulate(flags: Flags, io: CliIo): number {
  const trafficId = text(flags, "traffic") ?? "rush-hour";
  const scenario = scenarios.find((candidate) => candidate.id === trafficId);
  if (!scenario) {
    io.err(`Unknown traffic pattern "${trafficId}". Run "slotshield scenarios" to list them.`);
    return EXIT_USAGE;
  }

  const seed = Number(text(flags, "seed") ?? 8);
  if (!Number.isInteger(seed) || seed < 1 || seed >= 100_000) {
    io.err("--seed must be a whole number from 1 to 99999.");
    return EXIT_USAGE;
  }

  const enabled = readGuardrails(text(flags, "guardrails") ?? "none");
  if (typeof enabled === "string") {
    io.err(enabled);
    return EXIT_USAGE;
  }

  const result = simulate(scenario.id as ScenarioId, enabled, seed);
  const incidents = totalIncidents(result.summary);

  if (flags.has("json")) {
    io.out(JSON.stringify({
      scenario: result.scenarioId,
      seed: result.seed,
      guardrails: result.guardrails,
      summary: result.summary,
      events: result.events,
    }, null, 2));
    return incidents > 0 ? EXIT_FAILED : EXIT_OK;
  }

  const on = guardrails.filter((guardrail) => enabled[guardrail.id]).map((guardrail) => guardrail.id);
  io.out(`${scenario.title}${scenario.seeded ? ` (traffic ${seed})` : ""}`);
  io.out(`Guardrails on: ${on.length > 0 ? on.join(", ") : "none"}`);
  io.out("");

  for (const event of result.events) {
    if (event.outcome !== "incident" && !flags.has("events")) {
      continue;
    }
    const mark = event.outcome === "incident" ? "!" : " ";
    io.out(`${mark} ${formatClock(event.t)}  ${event.actor}: ${event.message}`);
  }
  if (incidents > 0 || flags.has("events")) {
    io.out("");
  }

  const { summary } = result;
  io.out(`${summary.customers} patients, ${summary.confirmed} confirmed, ${summary.correctlyRefused} correctly refused`);
  if (incidents === 0) {
    io.out("No incidents.");
    return EXIT_OK;
  }

  io.out(`${incidents} incident${incidents === 1 ? "" : "s"} affecting ${summary.affectedCustomers.length} patient${summary.affectedCustomers.length === 1 ? "" : "s"}:`);
  for (const type of Object.keys(incidentLabels) as IncidentType[]) {
    if (summary.byType[type] > 0) {
      io.out(`  ${String(summary.byType[type]).padStart(2)}  ${incidentLabels[type].name}`);
    }
  }
  io.out("Guardrails that would have prevented them:");
  for (const guardrail of guardrails) {
    if (summary.byCause[guardrail.id] > 0) {
      io.out(`  ${guardrail.id} (${summary.byCause[guardrail.id]})`);
    }
  }
  return EXIT_FAILED;
}

function readGuardrails(value: string): Guardrails | string {
  if (value === "all") {
    return { ...allOn };
  }
  if (value === "none" || value === "") {
    return { ...allOff };
  }
  const next: Guardrails = { ...allOff };
  for (const id of value.split(",").map((part) => part.trim()).filter(Boolean)) {
    if (!guardrails.some((guardrail) => guardrail.id === id)) {
      return `Unknown guardrail "${id}". Run "slotshield scenarios" to list them.`;
    }
    next[id as GuardrailId] = true;
  }
  return next;
}

interface StagingReply {
  status?: string;
  message?: string;
  scenarios?: { id: string; status: string; evidence: string }[];
}

async function runStaging(
  flags: Flags,
  env: Record<string, string | undefined>,
  io: CliIo,
): Promise<number> {
  const url = text(flags, "url");
  const token = env.SLOTSHIELD_TOKEN;
  if (!url) {
    io.err("--url is required, for example --url https://staging.example.com");
    return EXIT_USAGE;
  }
  if (!token) {
    io.err("Set SLOTSHIELD_TOKEN to a temporary test token for the staging adapter.");
    return EXIT_USAGE;
  }

  const requested = (text(flags, "scenarios") ?? SUPPORTED_SCENARIO_IDS.join(","))
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const unknown = requested.filter((id) => !isScenarioId(id));
  if (unknown.length > 0 || requested.length === 0) {
    io.err(`Unknown adapter scenario "${unknown[0] ?? ""}". Supported: ${SUPPORTED_SCENARIO_IDS.join(", ")}.`);
    return EXIT_USAGE;
  }

  const response = await handleStagingAudit(
    new Request("http://localhost/api/staging-audit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ baseUrl: url, token, scenarios: requested }),
    }),
  );
  const reply = (await response.json()) as StagingReply;
  const results = reply.scenarios ?? [];
  const passed = reply.status === "verified" &&
    results.length > 0 &&
    results.every((scenario) => scenario.status === "passed");

  if (flags.has("json")) {
    io.out(JSON.stringify(reply, null, 2));
    return passed ? EXIT_OK : EXIT_FAILED;
  }

  if (reply.message) {
    io.out(reply.message);
  }
  for (const scenario of results) {
    io.out(`  ${scenario.status.padEnd(11)}${scenario.id.padEnd(20)}${scenario.evidence}`);
  }
  io.out(passed ? "All selected scenarios passed." : "Staging needs attention.");
  return passed ? EXIT_OK : EXIT_FAILED;
}

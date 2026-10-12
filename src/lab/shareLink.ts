import { allOff, guardrails } from "../engine/clinic";
import { scenarios } from "../engine/scenarios";
import type { Guardrails, ScenarioId } from "../engine/types";

export interface SharedSetup {
  scenarioId: ScenarioId;
  guardrails: Guardrails;
  seed: number;
}

/** `#/lab?traffic=rush-hour&seed=8&guardrails=slot-lock,idempotency` */
export function setupToHash(setup: SharedSetup): string {
  const params = new URLSearchParams({ traffic: setup.scenarioId });
  if (scenarios.find((scenario) => scenario.id === setup.scenarioId)?.seeded) {
    params.set("seed", String(setup.seed));
  }
  const enabled = guardrails.filter((guardrail) => setup.guardrails[guardrail.id]).map((guardrail) => guardrail.id);
  if (enabled.length > 0) {
    params.set("guardrails", enabled.join(","));
  }
  return `#/lab?${params.toString().replaceAll("%2C", ",")}`;
}

export function setupFromHash(hash: string, fallbackSeed: number): SharedSetup | null {
  const [path, query] = hash.split("?");
  if (path !== "#/lab" || !query) {
    return null;
  }
  const params = new URLSearchParams(query);
  const scenario = scenarios.find((candidate) => candidate.id === params.get("traffic"));
  if (!scenario) {
    return null;
  }
  const seed = Number(params.get("seed"));
  const enabled = new Set((params.get("guardrails") ?? "").split(","));
  const next: Guardrails = { ...allOff };
  for (const guardrail of guardrails) {
    next[guardrail.id] = enabled.has(guardrail.id);
  }
  return {
    scenarioId: scenario.id,
    guardrails: next,
    seed: Number.isInteger(seed) && seed > 0 && seed < 100_000 ? seed : fallbackSeed,
  };
}

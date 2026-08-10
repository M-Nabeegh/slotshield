import type { ScenarioId } from "../domain/types";

export type { ScenarioId } from "../domain/types";

export const SUPPORTED_SCENARIO_IDS: readonly ScenarioId[] = [
  "race",
  "expired-hold",
  "duplicate-callback",
  "timezone",
];

export type StagingScenarioStatus = "passed" | "attention" | "not-tested";

export interface StagingAdapterManifest {
  contractVersion: 1;
  supports: ScenarioId[];
  testOnly: true;
}

export interface StagingScenarioResult {
  id: ScenarioId;
  status: StagingScenarioStatus;
  evidence: string;
}

export interface StagingAuditResult {
  status: "verified" | "attention";
  scenarios: StagingScenarioResult[];
}

export interface StagingAuditRequest {
  baseUrl: string;
  token: string;
  scenarios: ScenarioId[];
}

export function normalizeStagingManifest(
  input: unknown,
): StagingAdapterManifest | null {
  if (!isRecord(input)) {
    return null;
  }

  if (input.contractVersion !== 1 || input.testOnly !== true) {
    return null;
  }

  if (!Array.isArray(input.supports)) {
    return null;
  }

  const supports = uniqueScenarioIds(input.supports);
  return {
    contractVersion: 1,
    supports,
    testOnly: true,
  };
}

export function normalizeStagingResult(
  input: unknown,
  requestedScenarios: readonly ScenarioId[] = SUPPORTED_SCENARIO_IDS,
): StagingAuditResult {
  const requested = uniqueScenarioIds(requestedScenarios);
  const rawScenarios = isRecord(input) && Array.isArray(input.scenarios)
    ? input.scenarios
    : [];
  const results = new Map<ScenarioId, StagingScenarioResult>();

  for (const rawScenario of rawScenarios) {
    if (!isRecord(rawScenario) || !isScenarioId(rawScenario.id)) {
      continue;
    }

    if (!requested.includes(rawScenario.id)) {
      continue;
    }

    const status = isStagingScenarioStatus(rawScenario.status)
      ? rawScenario.status
      : "not-tested";
    const evidence = typeof rawScenario.evidence === "string"
      ? rawScenario.evidence.trim().slice(0, 240)
      : "No evidence returned.";

    results.set(rawScenario.id, {
      id: rawScenario.id,
      status,
      evidence: evidence || "No evidence returned.",
    });
  }

  const scenarios = requested.map((id) =>
    results.get(id) ?? {
      id,
      status: "not-tested" as const,
      evidence: rawScenarios.length > 0
        ? "No result returned."
        : "Adapter returned no supported results.",
    },
  );
  const rawStatus = isRecord(input) ? input.status : undefined;

  return {
    status: rawStatus === "verified" ? "verified" : "attention",
    scenarios,
  };
}

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" &&
    (SUPPORTED_SCENARIO_IDS as readonly string[]).includes(value);
}

function uniqueScenarioIds(values: readonly unknown[]): ScenarioId[] {
  return values.filter(isScenarioId).filter(
    (value, index, all) => all.indexOf(value) === index,
  );
}

function isStagingScenarioStatus(value: unknown): value is StagingScenarioStatus {
  return value === "passed" || value === "attention" || value === "not-tested";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

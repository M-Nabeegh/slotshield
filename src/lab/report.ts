import { clinic, formatClock, guardrails, incidentLabels } from "../engine/clinic";
import { totalIncidents } from "../engine/engine";
import { getScenario } from "../engine/scenarios";
import type { IncidentType, RunResult } from "../engine/types";

export function reportMarkdown(run: RunResult): string {
  const scenario = getScenario(run.scenarioId);
  const { summary } = run;
  const lines: string[] = [];
  const total = totalIncidents(summary);

  lines.push(`# SlotShield run: ${scenario.title}${scenario.seeded ? ` (traffic #${run.seed})` : ""}`);
  lines.push("");
  lines.push(`Fictional clinic: ${clinic.name}, ${clinic.city} (${clinic.timeZone}).`);
  lines.push("");
  lines.push(
    total === 0
      ? `All ${summary.customers} patients were handled correctly.`
      : `${summary.affectedCustomers.length} of ${summary.customers} patients were affected by ${total} incident${total === 1 ? "" : "s"}.`,
  );
  lines.push("");
  lines.push("## Guardrails");
  lines.push("");
  for (const guardrail of guardrails) {
    lines.push(`- [${run.guardrails[guardrail.id] ? "x" : " "}] ${guardrail.name}`);
  }
  lines.push("");
  lines.push("## Outcome");
  lines.push("");
  lines.push("| | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| Confirmed bookings | ${summary.confirmed} |`);
  lines.push(`| Correctly refused | ${summary.correctlyRefused} |`);
  for (const type of Object.keys(incidentLabels) as IncidentType[]) {
    lines.push(`| ${incidentLabels[type].plural} | ${summary.byType[type]} |`);
  }

  const missing = guardrails.filter((guardrail) => summary.byCause[guardrail.id] > 0);
  if (missing.length > 0) {
    lines.push("");
    lines.push("## Fixes");
    for (const guardrail of missing) {
      lines.push("");
      lines.push(`### ${guardrail.name} (${summary.byCause[guardrail.id]} incident${summary.byCause[guardrail.id] === 1 ? "" : "s"})`);
      lines.push("");
      lines.push(guardrail.summary);
      lines.push("");
      lines.push("```");
      lines.push(guardrail.code);
      lines.push("```");
    }
  }

  const incidents = run.events.filter((event) => event.outcome === "incident");
  if (incidents.length > 0) {
    lines.push("");
    lines.push("## Incident trace");
    lines.push("");
    for (const event of incidents) {
      lines.push(`- \`${formatClock(event.t)}\` ${event.actor}: ${event.message}`);
    }
  }

  return lines.join("\n");
}

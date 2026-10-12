import { guardrails } from "../engine/clinic";
import { getScenario } from "../engine/scenarios";
import type { Guardrails, ScenarioId } from "../engine/types";

export interface HistoryEntry {
  key: number;
  scenarioId: ScenarioId;
  seed: number;
  guardrails: Guardrails;
  affected: number;
  customers: number;
  incidents: number;
}

interface RunHistoryProps {
  entries: HistoryEntry[];
  activeKey: number | null;
  onRestore: (entry: HistoryEntry) => void;
}

export function RunHistory({ entries, activeKey, onRestore }: RunHistoryProps) {
  return (
    <section className="card" aria-labelledby="history-heading">
      <div className="card-head">
        <h2 className="label" id="history-heading">Runs this session</h2>
      </div>
      {entries.length === 0 ? (
        <p className="note" style={{ paddingTop: 10 }}>
          Runs you make appear here, so you can compare a setup before and after a guardrail.
        </p>
      ) : (
        <div className="history">
          {entries.map((entry) => {
            const scenario = getScenario(entry.scenarioId);
            const enabled = guardrails.filter((guardrail) => entry.guardrails[guardrail.id]).length;
            return (
              <button
                type="button"
                key={entry.key}
                className="history-row"
                aria-current={entry.key === activeKey ? "true" : undefined}
                onClick={() => onRestore(entry)}
              >
                <span className="history-title">
                  {scenario.title}
                  {scenario.seeded ? <span className="faint"> #{entry.seed}</span> : null}
                </span>
                <span className="history-meta">
                  <span className="guard-dots" aria-hidden="true">
                    {guardrails.map((guardrail) => (
                      <span key={guardrail.id} className={entry.guardrails[guardrail.id] ? "on" : ""} />
                    ))}
                  </span>
                  {enabled} of 4 guardrails
                </span>
                <span className={`history-result ${entry.affected > 0 ? "danger" : "ok"}`}>
                  {entry.affected > 0 ? `${entry.affected} affected` : "Clean"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

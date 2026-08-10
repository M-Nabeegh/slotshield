import { scenarios } from "../domain/scenarios";
import type { ScenarioId } from "../domain/types";

export function ScenarioPicker({
  onSelect,
  selectedId,
}: {
  onSelect: (id: ScenarioId) => void;
  selectedId: ScenarioId;
}) {
  return (
    <div className="scenario-grid" role="list" aria-label="Reliability scenarios">
      {scenarios.map((scenario, index) => (
        <button
          className={`scenario-card ${scenario.id === selectedId ? "is-selected" : ""}`}
          type="button"
          key={scenario.id}
          aria-pressed={scenario.id === selectedId}
          onClick={() => onSelect(scenario.id)}
        >
          <span className="scenario-index">0{index + 1}</span>
          <span className="scenario-category">{scenario.category}</span>
          <strong>{scenario.title}</strong>
          <span className="scenario-description">{scenario.description}</span>
          <span className="scenario-open" aria-hidden="true">↗</span>
        </button>
      ))}
    </div>
  );
}

import { guardrailInfo } from "../engine/clinic";
import { scenarios } from "../engine/scenarios";
import type { ScenarioId } from "../engine/types";

interface ScenarioPickerProps {
  value: ScenarioId;
  onChange: (id: ScenarioId) => void;
}

export function ScenarioPicker({ value, onChange }: ScenarioPickerProps) {
  return (
    <section className="card" aria-labelledby="scenario-heading">
      <div className="card-head">
        <h2 className="label" id="scenario-heading">Traffic</h2>
      </div>
      <div className="scenario-list" role="radiogroup" aria-labelledby="scenario-heading">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            role="radio"
            aria-checked={scenario.id === value}
            className="scenario-option"
            onClick={() => onChange(scenario.id)}
          >
            <span className="scenario-option-title">{scenario.title}</span>
            <span className="scenario-option-meta">
              {scenario.focus ? `Tests ${guardrailInfo(scenario.focus).name.toLowerCase()}` : "Mixed traffic, replayable by number"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

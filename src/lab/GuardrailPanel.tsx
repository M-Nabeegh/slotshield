import { allOff, allOn, guardrails } from "../engine/clinic";
import type { GuardrailId, Guardrails } from "../engine/types";
import { Switch } from "../ui/Switch";

interface GuardrailPanelProps {
  value: Guardrails;
  focus: GuardrailId | null;
  onChange: (next: Guardrails) => void;
}

export function GuardrailPanel({ value, focus, onChange }: GuardrailPanelProps) {
  const enabled = guardrails.filter((guardrail) => value[guardrail.id]).length;

  return (
    <section className="card" aria-labelledby="guardrail-heading">
      <div className="card-head">
        <h2 className="label" id="guardrail-heading">
          Guardrails <span className="faint">· {enabled} of {guardrails.length} on</span>
        </h2>
        <button
          type="button"
          className="button quiet small"
          onClick={() => onChange(enabled === guardrails.length ? allOff : allOn)}
        >
          {enabled === guardrails.length ? "Turn all off" : "Turn all on"}
        </button>
      </div>
      <div className="guardrail-list">
        {guardrails.map((guardrail) => (
          <div className="guardrail" key={guardrail.id}>
            <div className="guardrail-name" id={`guardrail-${guardrail.id}`}>
              {guardrail.name}
              {focus === guardrail.id ? <span className="pill guardrail-focus">Tested here</span> : null}
            </div>
            <Switch
              checked={value[guardrail.id]}
              label={guardrail.name}
              onChange={(checked) => onChange({ ...value, [guardrail.id]: checked })}
            />
            <p className="guardrail-summary">{guardrail.summary}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

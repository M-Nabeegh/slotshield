import type { ReactNode } from "react";
import { guardrails, incidentLabels } from "../engine/clinic";
import type { GuardrailId, Guardrails, IncidentType, RunResult } from "../engine/types";
import { CopyIcon, LinkIcon } from "../ui/icons";
import { progressAt } from "./derive";

interface OutcomePanelProps {
  run: RunResult | null;
  index: number;
  stale: boolean;
  guardrailsNow: Guardrails;
  onFix: (id: GuardrailId) => void;
  onCopy: () => void;
  onCopyLink: () => void;
}

const types = Object.keys(incidentLabels) as IncidentType[];

export function OutcomePanel({ run, index, stale, guardrailsNow, onFix, onCopy, onCopyLink }: OutcomePanelProps) {
  if (!run) {
    return (
      <section className="card" aria-labelledby="outcome-heading">
        <div className="card-head">
          <h2 className="label" id="outcome-heading">Outcome</h2>
        </div>
        <div className="outcome-headline">
          <p className="outcome-figure faint">Not run yet</p>
          <p className="muted">
            Press Run to send this traffic through the booking API. Incidents are counted as they happen.
          </p>
        </div>
      </section>
    );
  }

  const progress = progressAt(run, index);
  const customers = run.summary.customers;
  const affected = progress.affected.length;
  const maxCount = Math.max(1, ...types.map((type) => progress.byType[type]));
  const fixable = guardrails.filter((guardrail) => progress.byCause[guardrail.id] > 0);
  const untested = guardrails.filter((guardrail) => !run.guardrails[guardrail.id]);

  let figure: ReactNode;
  if (index < 0) {
    figure = <p className="outcome-figure faint">Starting…</p>;
  } else if (affected > 0) {
    figure = (
      <p className="outcome-figure danger">
        {affected}
        <small>of {customers} patients affected</small>
      </p>
    );
  } else if (progress.done) {
    figure = (
      <p className="outcome-figure ok">
        {customers}
        <small>of {customers} patients handled cleanly</small>
      </p>
    );
  } else {
    figure = (
      <p className="outcome-figure">
        0<small>patients affected so far</small>
      </p>
    );
  }

  return (
    <section className="card" aria-labelledby="outcome-heading">
      <div className="card-head">
        <h2 className="label" id="outcome-heading">
          Outcome{progress.done ? "" : " so far"}
          {stale ? <span className="faint"> · previous settings</span> : null}
        </h2>
        <span style={{ display: "flex" }}>
          <button type="button" className="button quiet small" onClick={onCopyLink}>
            <LinkIcon size={14} />
            Link
          </button>
          <button type="button" className="button quiet small" onClick={onCopy} disabled={!progress.done}>
            <CopyIcon size={14} />
            Report
          </button>
        </span>
      </div>

      <div className="outcome-headline" aria-live="polite" aria-atomic="true">
        {figure}
        {progress.done && affected > 0 ? (
          <p className="muted">{listNames(progress.affected)} had a booking go wrong.</p>
        ) : null}
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-value">{progress.confirmed}</span>
          <span className="label">Booked</span>
        </div>
        <div className="stat">
          <span className="stat-value">{progress.refused}</span>
          <span className="label">Refused correctly</span>
        </div>
        <div className="stat">
          <span className="stat-value" style={progress.incidents > 0 ? { color: "var(--danger)" } : undefined}>
            {progress.incidents}
          </span>
          <span className="label">Incidents</span>
        </div>
      </div>

      <div className="incident-rows">
        {types.map((type) => {
          const count = progress.byType[type];
          return (
            <div className={`incident-row${count === 0 ? " is-zero" : ""}`} key={type}>
              <span className="incident-row-name">{incidentLabels[type].plural}</span>
              <span className="incident-row-count">{count}</span>
              <span className="bar" aria-hidden="true">
                <span style={{ width: `${(count / maxCount) * 100}%` }} />
              </span>
            </div>
          );
        })}
      </div>

      {progress.done && fixable.length > 0 ? (
        <div className="fixes">
          <p className="label">What would have prevented this</p>
          {fixable.map((guardrail) => (
            <div className="fix" key={guardrail.id}>
              <div className="fix-head">
                <span className="fix-name">{guardrail.name}</span>
                <span className="faint" style={{ fontSize: 12 }}>
                  {progress.byCause[guardrail.id]} incident{progress.byCause[guardrail.id] === 1 ? "" : "s"}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>{guardrail.summary}</p>
              <details>
                <summary>Show the change</summary>
                <pre className="code-block">{guardrail.code}</pre>
              </details>
              {guardrailsNow[guardrail.id] ? (
                <p className="faint" style={{ fontSize: 12 }}>Already switched on. Run again to compare.</p>
              ) : (
                <button type="button" className="button primary small" onClick={() => onFix(guardrail.id)}>
                  Turn on and run again
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {progress.done && fixable.length === 0 && untested.length > 0 ? (
        <p className="note">
          Nothing broke, though {listNames(untested.map((guardrail) => guardrail.name.toLowerCase()))}{" "}
          {untested.length === 1 ? "was" : "were"} off. This traffic never reached{" "}
          {untested.length === 1 ? "that code path" : "those code paths"}.
        </p>
      ) : null}
    </section>
  );
}

function listNames(names: string[]): string {
  if (names.length <= 1) {
    return names.join("");
  }
  if (names.length > 4) {
    return `${names.slice(0, 3).join(", ")} and ${names.length - 3} others`;
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

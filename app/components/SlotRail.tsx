import type { ScenarioId } from "../domain/types";

export function SlotRail({
  hasRun,
  selectedId,
}: {
  hasRun: boolean;
  selectedId: ScenarioId;
}) {
  const incomingLabel = selectedId === "race" ? "Request B" : "Incoming request";

  return (
    <aside className={`slot-rail-card${hasRun ? " is-live" : ""}`} aria-label="10:15 booking slot rail">
      <div className="slot-rail-heading">
        <div>
          <p className="eyebrow">Live slot rail</p>
          <strong>One slot. Two requests.</strong>
        </div>
        <span className="slot-rail-status">{hasRun ? "Observed" : "Ready"}</span>
      </div>
      <div className="slot-rail-visual" aria-hidden="true">
        <div className="slot-rail-lane lane-accepted">
          <span>Request A</span>
          <i />
        </div>
        <div className="slot-rail-target">
          <time>10:15</time>
          <span>protected slot</span>
        </div>
        <div className="slot-rail-lane lane-conflict">
          <span>{incomingLabel}</span>
          <i />
        </div>
      </div>
      <div className="slot-rail-legend">
        <span><i className="legend-dot dot-mint" /> Accepted claim</span>
        <span><i className="legend-dot dot-coral" /> Conflict blocked</span>
      </div>
    </aside>
  );
}

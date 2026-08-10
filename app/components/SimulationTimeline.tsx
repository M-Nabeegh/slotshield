import type { EventOutcome, ScenarioReport } from "../domain/types";

const outcomeCopy: Record<EventOutcome, string> = {
  received: "Received",
  accepted: "Accepted",
  rejected: "Rejected",
  ignored: "Ignored",
};

export function SimulationTimeline({
  hasRun,
  report,
}: {
  hasRun: boolean;
  report: ScenarioReport;
}) {
  return (
    <article className={`timeline-panel ${hasRun ? "has-run" : ""}`}>
      <div className="timeline-header">
        <div>
          <p className="panel-label">Event trace</p>
          <h2>{hasRun ? "Simulation complete" : "Ready to test"}</h2>
        </div>
        <span className="trace-code">TRACE / {report.id.toUpperCase()}</span>
      </div>
      <ol className="event-list">
        {report.events.map((event) => (
          <li className={`event-row outcome-${event.outcome}`} key={`${report.id}-${event.order}`}>
            <span className="event-order">{String(event.order).padStart(2, "0")}</span>
            <div className="event-rail"><span /></div>
            <div className="event-copy">
              <div className="event-meta">
                <span>{event.actor}</span>
                <time>{event.time}</time>
              </div>
              <p>{event.message}</p>
            </div>
            <span className="outcome-badge">{outcomeCopy[event.outcome]}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

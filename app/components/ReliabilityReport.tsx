import type { CSSProperties } from "react";
import { Metric } from "./Metric";
import type { ScenarioReport } from "../domain/types";

export function ReliabilityReport({
  report,
  shareUrl,
}: {
  report: ScenarioReport;
  shareUrl: string;
}) {
  const scoreStyle = {
    background: `conic-gradient(var(--protected-mint) ${report.reliabilityScore * 3.6}deg, rgba(17, 21, 29, 0.12) 0deg)`,
  } as CSSProperties;

  return (
    <section className="report-section content-width" aria-labelledby="report-heading" aria-live="polite">
      <div className="report-heading">
        <div>
          <p className="eyebrow">Simulation result</p>
          <h2 id="report-heading">Reliability report</h2>
        </div>
        <p>One rule is doing the work. The trace shows exactly where it protected the slot.</p>
      </div>

      <div className="report-grid">
        <article className="score-card">
          <div className="score-ring" style={scoreStyle}>
            <div className="score-center">
              <strong>{report.reliabilityScore}</strong>
              <span>/100</span>
            </div>
          </div>
          <div>
            <p className="panel-label">Reliability signal</p>
            <h3>Guardrail held</h3>
            <p>{report.finalState.summary}</p>
          </div>
        </article>

        <article className="state-card">
          <p className="panel-label">Final state</p>
          <div className="state-metrics">
            <Metric value={report.finalState.confirmedBookings} label="confirmed" />
            <Metric value={report.finalState.rejectedRequests} label="rejected" />
            <Metric value={report.finalState.cancelledHolds} label="holds cleared" />
            <Metric value={report.finalState.ignoredCallbacks} label="duplicates ignored" />
          </div>
          <div className="recommendation">
            <span className="recommendation-label">Recommendation</span>
            <p>{report.recommendation}</p>
          </div>
        </article>
      </div>

      <div className="report-share">
        <div>
          <p className="panel-label">Client handoff</p>
          <strong>Share this sandbox</strong>
          <p>Send the public preview to a teammate. It opens without an account.</p>
        </div>
        <code>{shareUrl}</code>
      </div>
    </section>
  );
}

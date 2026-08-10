import type { ScenarioDefinition, ScenarioReport } from "../domain/types";

const severityCopy = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
} as const;

export function ScenarioBriefing({
  onRun,
  report,
  scenario,
}: {
  onRun: () => void;
  report: ScenarioReport;
  scenario: ScenarioDefinition;
}) {
  return (
    <article className="briefing-panel">
      <div className="panel-kicker">
        <span className={`severity severity-${report.severity}`}>
          {severityCopy[report.severity]} risk
        </span>
        <span>Selected scenario</span>
      </div>
      <h2>{scenario.title}</h2>
      <p className="briefing-description">{scenario.description}</p>
      <dl className="briefing-list">
        <div>
          <dt>Risk</dt>
          <dd>{scenario.risk}</dd>
        </div>
        <div>
          <dt>Protection</dt>
          <dd>{scenario.protection}</dd>
        </div>
      </dl>
      <button className="button button-primary button-wide" type="button" onClick={onRun}>
        Run scenario
        <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}

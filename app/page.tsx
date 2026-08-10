"use client";

import { useState, type CSSProperties } from "react";
import { PublicAccessBar } from "./components/PublicAccessBar";
import { ScenarioBriefing } from "./components/ScenarioBriefing";
import { ScenarioPicker } from "./components/ScenarioPicker";
import { SlotShieldMark } from "./components/SlotShieldMark";
import { SlotRail } from "./components/SlotRail";
import { runScenario } from "./domain/bookingEngine";
import { scenarios } from "./domain/scenarios";
import type { EventOutcome, ScenarioId } from "./domain/types";
import { PUBLIC_PREVIEW_URL } from "./lib/publicPreview";

const outcomeCopy: Record<EventOutcome, string> = {
  received: "Received",
  accepted: "Accepted",
  rejected: "Rejected",
  ignored: "Ignored",
};

export default function Home() {
  const [selectedId, setSelectedId] = useState<ScenarioId>("race");
  const [hasRun, setHasRun] = useState(false);
  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedId) ?? scenarios[0];
  const report = runScenario(selectedScenario.id);
  const scoreStyle = {
    background: `conic-gradient(var(--aqua) ${report.reliabilityScore * 3.6}deg, rgba(255, 255, 255, 0.1) 0deg)`,
  } as CSSProperties;

  function selectScenario(id: ScenarioId) {
    setSelectedId(id);
    setHasRun(false);
  }

  return (
    <main className="site-shell">
      <div className="grid-veil" aria-hidden="true" />
      <div className="aurora aurora-one" aria-hidden="true" />
      <div className="aurora aurora-two" aria-hidden="true" />

      <nav className="topbar" aria-label="SlotShield navigation">
        <a className="brand" href="#top" aria-label="SlotShield home">
          <SlotShieldMark compact />
          <span className="brand-name">SlotShield</span>
        </a>
        <div className="product-context" aria-label="Current workspace">
          <span className="product-section">Simulator</span>
          <span className="product-breadcrumb">Reliability lab / Booking flows</span>
        </div>
        <PublicAccessBar shareUrl={PUBLIC_PREVIEW_URL} />
      </nav>

      <section className="hero content-width" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Booking reliability lab / Public simulator</p>
          <h1 id="hero-title">
            Rehearse the moment
            <span>booking trust breaks.</span>
          </h1>
          <p className="hero-description">
            SlotShield turns the edge cases behind appointment booking into a
            deterministic trace your team can understand before customers feel it.
          </p>
          <div className="hero-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => setHasRun(true)}
            >
              Try this scenario
              <span aria-hidden="true">→</span>
            </button>
            <a className="button button-quiet" href="#failure-modes">
              Browse scenarios
            </a>
          </div>
          <div className="hero-trust" aria-label="Sandbox guarantees">
            <span>Synthetic data</span>
            <span>No account required</span>
            <span>No integrations</span>
          </div>
        </div>
        <SlotRail hasRun={hasRun} selectedId={selectedId} />
      </section>

      <section className="failure-section content-width" id="failure-modes" aria-labelledby="failure-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Choose a stress test</p>
            <h2 id="failure-heading">The failures that quietly break trust.</h2>
          </div>
          <p>Pick one. SlotShield explains the guardrail, then plays the outcome as a deterministic trace.</p>
        </div>

        <ScenarioPicker onSelect={selectScenario} selectedId={selectedId} />
      </section>

      <section className="workbench content-width" id="simulation" aria-labelledby="workbench-heading">
        <div className="workbench-intro">
          <p className="eyebrow">Scenario workbench</p>
          <p id="workbench-heading">Everything below is a replayable, fake-data simulation.</p>
        </div>

        <div className="workbench-grid">
          <ScenarioBriefing
            onRun={() => setHasRun(true)}
            report={report}
            scenario={selectedScenario}
          />

          <article className={`timeline-panel ${hasRun ? "has-run" : ""}`}>
            <div className="timeline-header">
              <div>
                <p className="panel-label">Event trace</p>
                <h2>{hasRun ? "Run complete" : "Ready to run"}</h2>
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
        </div>
      </section>

      {hasRun ? (
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
        </section>
      ) : (
        <section className="ready-note content-width" aria-live="polite">
          <span className="ready-orb" aria-hidden="true" />
          <p><strong>Ready when you are.</strong> Run the selected scenario to inspect the final booking state.</p>
        </section>
      )}

      <footer className="footer content-width">
        <span className="brand footer-brand"><SlotShieldMark compact />SlotShield</span>
        <p>Designed as a reliability rehearsal, with no real booking actions.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="metric">
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
    </div>
  );
}

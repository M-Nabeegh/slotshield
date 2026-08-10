"use client";

import { useState } from "react";
import { PublicAccessBar } from "./components/PublicAccessBar";
import { ScenarioBriefing } from "./components/ScenarioBriefing";
import { ScenarioPicker } from "./components/ScenarioPicker";
import { ReliabilityReport } from "./components/ReliabilityReport";
import { SimulationTimeline } from "./components/SimulationTimeline";
import { SlotShieldMark } from "./components/SlotShieldMark";
import { HowItWorks } from "./components/HowItWorks";
import { runScenario } from "./domain/bookingEngine";
import { scenarios } from "./domain/scenarios";
import type { ScenarioId } from "./domain/types";
import { WebsiteAuditPanel } from "./components/WebsiteAuditPanel";
import { PUBLIC_PREVIEW_URL } from "./lib/publicPreview";

export default function Home() {
  const [selectedId, setSelectedId] = useState<ScenarioId>("race");
  const [hasRun, setHasRun] = useState(false);
  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedId) ?? scenarios[0];
  const report = runScenario(selectedScenario.id);

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

      <WebsiteAuditPanel onTryScenario={() => setHasRun(true)} />
      <HowItWorks />

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

          <SimulationTimeline hasRun={hasRun} report={report} />
        </div>
      </section>

      {hasRun ? (
        <ReliabilityReport report={report} shareUrl={PUBLIC_PREVIEW_URL} />
      ) : (
        <section className="ready-note content-width" aria-live="polite">
          <span className="ready-orb" aria-hidden="true" />
          <p><strong>Ready when you are.</strong> Run the selected scenario to inspect the final booking state.</p>
        </section>
      )}

      <footer className="footer content-width">
        <span className="brand footer-brand"><SlotShieldMark compact />SlotShield</span>
        <p>Designed as a reliability rehearsal, with no real booking actions.</p>
        <p className="footer-credit">Designed and engineered by Muhammad Nabeegh</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}

"use client";

import { useState } from "react";
import type { ScenarioId } from "../domain/types";
import type { StagingAuditResult } from "../lib/stagingContract";
import { SUPPORTED_SCENARIO_IDS } from "../lib/stagingContract";
import type { WebsiteCheckResult } from "../lib/websiteAudit";
import { ProductHero, type ProductCheckState } from "./ProductHero";

interface WebsiteAuditPanelProps {
  onTryScenario: () => void;
}

type StagingCheckState = "idle" | "checking" | "success" | "error";

export function WebsiteAuditPanel({ onTryScenario }: WebsiteAuditPanelProps) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [publicState, setPublicState] = useState<ProductCheckState>("idle");
  const [publicResult, setPublicResult] = useState<WebsiteCheckResult | null>(null);
  const [publicError, setPublicError] = useState("");
  const [stagingOpen, setStagingOpen] = useState(false);
  const [stagingUrl, setStagingUrl] = useState("");
  const [stagingToken, setStagingToken] = useState("");
  const [selectedScenarios, setSelectedScenarios] = useState<ScenarioId[]>([
    ...SUPPORTED_SCENARIO_IDS,
  ]);
  const [stagingState, setStagingState] = useState<StagingCheckState>("idle");
  const [stagingResult, setStagingResult] = useState<StagingAuditResult | null>(null);
  const [stagingMessage, setStagingMessage] = useState("");

  async function checkWebsite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublicState("checking");
    setPublicResult(null);
    setPublicError("");

    try {
      const response = await fetch("/api/website-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: websiteUrl }),
      });
      const payload = await response.json() as Partial<WebsiteCheckResult> & {
        message?: string;
      };

      if (!response.ok || payload.status === "blocked") {
        throw new Error(payload.message ?? "We could not verify that website.");
      }

      setPublicResult(payload as WebsiteCheckResult);
      setPublicState("success");
    } catch (error) {
      setPublicState("error");
      const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
      setPublicError(`We could not verify that website.${detail}`);
    }
  }

  async function runStagingAudit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStagingState("checking");
    setStagingResult(null);
    setStagingMessage("");

    try {
      const response = await fetch("/api/staging-audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baseUrl: stagingUrl,
          token: stagingToken,
          scenarios: selectedScenarios,
        }),
      });
      const payload = await response.json() as StagingAuditResult & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "We could not reach the staging adapter.");
      }

      setStagingResult(payload);
      setStagingMessage(payload.message ?? "Staging adapter completed.");
      setStagingState("success");
      setStagingToken("");
    } catch (error) {
      setStagingState("error");
      setStagingMessage(
        error instanceof Error && error.message
          ? error.message
          : "We could not reach the staging adapter. Check the test URL and token.",
      );
    }
  }

  function toggleScenario(id: ScenarioId) {
    setSelectedScenarios((current) =>
      current.includes(id)
        ? current.filter((scenarioId) => scenarioId !== id)
        : [...current, id],
    );
  }

  return (
    <section
      className="website-audit content-width"
      id="website-audit"
      aria-label="SlotShield public check"
    >
      <ProductHero
        websiteUrl={websiteUrl}
        publicState={publicState}
        stagingOpen={stagingOpen}
        onWebsiteUrlChange={setWebsiteUrl}
        onSubmit={checkWebsite}
        onOpenStaging={() => setStagingOpen(true)}
        onTryScenario={onTryScenario}
      />

      <div className="website-audit-card">
        {publicState === "error" ? (
          <div className="website-audit-message is-error" role="alert">
            <strong>Public check stopped</strong>
            <p>{publicError}</p>
          </div>
        ) : null}

        {publicResult ? (
          <div className="website-audit-result" id="public-check-result" aria-live="polite">
            <div className="website-audit-result-heading">
              <div>
                <p className="panel-label">Public check</p>
                <h3>
                  {publicResult.status === "verified" ? "Public surface verified" : "Public check needs attention"}
                </h3>
              </div>
              <span className={`audit-status audit-status-${publicResult.status}`}>
                {publicResult.status === "verified" ? "Verified" : "Attention"}
              </span>
            </div>
            <p className="website-audit-result-message">{publicResult.message}</p>

            <section className="audit-result-section" aria-labelledby="observed-heading">
              <p className="panel-label">Evidence</p>
              <h4 id="observed-heading">What we observed</h4>
              <p>
                {publicResult.pageTitle
                  ? `Reached “${publicResult.pageTitle}” at ${publicResult.finalUrl ?? publicResult.requestedUrl}.`
                  : `Reached ${publicResult.finalUrl ?? publicResult.requestedUrl}.`}
              </p>
            </section>

            <section className="audit-result-section" aria-labelledby="facts-heading">
              <h4 id="facts-heading">Key facts</h4>
              <dl className="audit-fact-list" aria-label="Public check facts">
                <div>
                  <dt>HTTPS</dt>
                  <dd>{publicResult.https ? "Active" : "Missing"}</dd>
                </div>
                <div>
                  <dt>HTTP status</dt>
                  <dd>{publicResult.httpStatus ?? "Not available"}</dd>
                </div>
                <div>
                  <dt>Response</dt>
                  <dd>{publicResult.responseTimeMs === null ? "Not available" : `${publicResult.responseTimeMs} ms`}</dd>
                </div>
                <div>
                  <dt>Booking links</dt>
                  <dd>{publicResult.bookingLinks.length} found</dd>
                </div>
                <div>
                  <dt>Content</dt>
                  <dd>{publicResult.contentType?.toLowerCase().includes("text/html") ? "HTML page" : publicResult.contentType ?? "Not available"}</dd>
                </div>
              </dl>
            </section>

            <section className="audit-result-section" aria-labelledby="findings-heading">
              <h4 id="findings-heading">Findings</h4>
              <ul className="website-audit-findings" aria-label="Website findings">
                {publicResult.findings.map((finding) => (
                  <li key={finding.id} className={`audit-finding audit-finding-${finding.status}`}>
                    <span aria-hidden="true" />
                    <div>
                      <strong>{finding.label}</strong>
                      <p>{finding.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {publicResult.bookingLinks.length > 0 ? (
              <div className="website-audit-links">
                <p className="panel-label">Booking pages found</p>
                {publicResult.bookingLinks.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                    <span>{link.label}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            ) : null}

            <section className="audit-result-section audit-result-boundary" aria-labelledby="boundary-heading">
              <p className="panel-label">Boundary applied</p>
              <h4 id="boundary-heading">What this check cannot prove</h4>
              <p>
                Private booking behavior was not tested. This check does not book
                a slot, process payment, validate concurrency, or inspect
                authenticated flows.
              </p>
            </section>

            <section className="audit-result-section audit-result-next" aria-labelledby="next-action-heading">
              <p className="panel-label">Keep going</p>
              <h4 id="next-action-heading">Next action</h4>
              <p>Use a test-only environment for deeper adapter checks, or rehearse a fictional failure locally.</p>
              <div className="website-audit-actions">
                <button className="button button-primary" type="button" onClick={() => setStagingOpen(true)}>
                  Audit a staging flow
                </button>
                <button className="button button-quiet" type="button" onClick={onTryScenario}>
                  Try a fake scenario
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {!publicResult && publicState !== "error" ? (
          <div className="website-audit-actions website-audit-actions-idle">
            <button className="button button-quiet" type="button" onClick={() => setStagingOpen(true)}>
              Audit a staging flow
            </button>
            <button className="button button-quiet" type="button" onClick={onTryScenario}>
              Try a fake scenario
            </button>
          </div>
        ) : null}

        {stagingOpen ? (
          <div className="staging-audit-panel" id="staging-audit" aria-labelledby="staging-audit-title">
            <div className="staging-audit-heading">
              <div>
                <p className="panel-label">Test environment only</p>
                <h3 id="staging-audit-title">Audit a staging flow</h3>
              </div>
              <button className="text-button" type="button" onClick={() => setStagingOpen(false)}>
                Close
              </button>
            </div>
            <p>
              Add a staging URL and a temporary token for the SlotShield adapter.
              Nothing here should point at live bookings or payments.
            </p>
            <form className="staging-audit-form" onSubmit={runStagingAudit}>
              <label htmlFor="staging-url">Staging URL</label>
              <input
                id="staging-url"
                name="staging-url"
                type="url"
                inputMode="url"
                placeholder="https://staging.your-clinic.com"
                value={stagingUrl}
                onChange={(event) => setStagingUrl(event.target.value)}
                required
              />
              <label htmlFor="staging-token">Temporary test token</label>
              <input
                id="staging-token"
                name="staging-token"
                type="password"
                autoComplete="off"
                placeholder="Only for this test run"
                value={stagingToken}
                onChange={(event) => setStagingToken(event.target.value)}
                required
              />
              <fieldset>
                <legend>Scenarios to run</legend>
                <div className="staging-scenario-grid">
                  {SUPPORTED_SCENARIO_IDS.map((id) => (
                    <label key={id}>
                      <input
                        type="checkbox"
                        checked={selectedScenarios.includes(id)}
                        onChange={() => toggleScenario(id)}
                      />
                      <span>{scenarioLabel(id)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="button button-primary" type="submit" disabled={stagingState === "checking" || selectedScenarios.length === 0}>
                {stagingState === "checking" ? "Running synthetic tests…" : "Run staging audit"}
              </button>
            </form>
            {stagingMessage ? (
              <div className={`staging-audit-result staging-audit-result-${stagingState}`} aria-live="polite">
                <strong>{stagingState === "error" ? "Staging audit stopped" : stagingResult?.status === "verified" ? "Staging audit complete" : "Staging setup needs attention"}</strong>
                <p>{stagingMessage}</p>
                {stagingResult ? (
                  <ul>
                    {stagingResult.scenarios.map((scenario) => (
                      <li key={scenario.id}>
                        <span>{scenarioLabel(scenario.id)}</span>
                        <strong>{scenario.status}</strong>
                        <p>{scenario.evidence}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function scenarioLabel(id: ScenarioId): string {
  if (id === "race") return "Double-booking race";
  if (id === "expired-hold") return "Expired payment hold";
  if (id === "duplicate-callback") return "Duplicate payment callback";
  return "Time-zone mismatch";
}

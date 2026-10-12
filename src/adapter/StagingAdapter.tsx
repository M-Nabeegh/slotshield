import { useState, type FormEvent } from "react";
import { apiAvailable } from "../apiAvailable";
import { getScenario } from "../engine/scenarios";
import { AlertIcon, CheckIcon, DashIcon } from "../ui/icons";
import {
  SUPPORTED_SCENARIO_IDS,
  type ScenarioId,
  type StagingAuditResult,
} from "../../server/stagingContract";

type Result = StagingAuditResult & { message?: string };

const manifest = `{
  "contractVersion": 1,
  "supports": [
    "race",
    "expired-hold",
    "duplicate-callback",
    "timezone"
  ],
  "testOnly": true
}`;

const runRequest = `POST /.well-known/slotshield-test/run
Authorization: Bearer <token>

{
  "mode": "synthetic",
  "scenarios": ["race"],
  "testNamespace": "slotshield-6f1c…"
}`;

export function StagingAdapter() {
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [selected, setSelected] = useState<ScenarioId[]>([...SUPPORTED_SCENARIO_IDS]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const toggle = (id: ScenarioId) => {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/staging-audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseUrl: baseUrl.trim(), token, scenarios: selected }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message ?? "The staging adapter could not be called.");
      } else {
        setResult(data as Result);
        setToken("");
      }
    } catch {
      setError("The server did not respond. Is the dev server running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="doc-page">
      <div className="stack">
        <header className="doc-intro">
          <h1>Run the scenarios against your staging API</h1>
          <p>
            The Lab shows what a booking system should do. To find out what yours actually does, expose two
            small test-only endpoints on staging and let SlotShield drive the same four scenarios with
            synthetic patients.
          </p>
        </header>

        <section className="card card-body" aria-label="Staging run">
          <form className="form-grid" onSubmit={submit}>
            {!apiAvailable ? (
              <p className="banner">
                <strong>Staging runs need the local server.</strong> This hosted preview is static. Run{" "}
                <code>npm run dev</code> to call your adapter.
              </p>
            ) : null}
            <div className="field">
              <label className="label" htmlFor="staging-url">Staging base URL</label>
              <input
                id="staging-url"
                className="input"
                type="url"
                spellCheck={false}
                placeholder="https://staging.yourclinic.com"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                disabled={!apiAvailable}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="staging-token">Temporary test token</label>
              <input
                id="staging-token"
                className="input"
                type="password"
                autoComplete="off"
                placeholder="Scoped to the two test endpoints"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                disabled={!apiAvailable}
              />
              <span className="faint" style={{ fontSize: 12 }}>
                Sent once as a bearer token, never stored, and cleared from this form after a run.
              </span>
            </div>
            <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="label" style={{ marginBottom: 6 }}>Scenarios</legend>
              <div className="checks">
                {SUPPORTED_SCENARIO_IDS.map((id) => (
                  <label className="check-option" key={id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(id)}
                      onChange={() => toggle(id)}
                      disabled={!apiAvailable}
                    />
                    {getScenario(id).title}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <button
                type="submit"
                className="button primary"
                disabled={!apiAvailable || busy || !baseUrl.trim() || !token.trim() || selected.length === 0}
              >
                {busy ? <span className="spinner" aria-hidden="true" /> : null}
                {busy ? "Running on staging" : "Run on staging"}
              </button>
            </div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
          </form>
        </section>

        {result ? (
          <section className="card" aria-live="polite">
            <div className="card-body" style={{ display: "grid", gap: 4 }}>
              <p className="section-title">
                {result.status === "verified" ? "Adapter run complete" : "Adapter run needs attention"}
              </p>
              {result.message ? <p className="muted">{result.message}</p> : null}
            </div>
            <div className="findings" style={{ borderTop: "1px solid var(--hairline)" }}>
              {result.scenarios.map((scenario) => (
                <div className="finding" key={scenario.id}>
                  <span className={`finding-icon ${scenario.status}`}>
                    {scenario.status === "passed" ? <CheckIcon /> : scenario.status === "attention" ? <AlertIcon /> : <DashIcon />}
                  </span>
                  <span className="finding-label">{getScenario(scenario.id).title}</span>
                  <span className="faint" style={{ fontSize: 12 }}>
                    {scenario.status === "passed" ? "Passed" : scenario.status === "attention" ? "Failed" : "Not tested"}
                  </span>
                  <span className="finding-detail">{scenario.evidence}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <aside className="stack">
        <section className="card card-body stack">
          <h2 className="section-title">The contract</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            SlotShield first reads a manifest. If it is missing, not version 1, or not marked test-only, the run
            stops there. It never falls back to another path.
          </p>
          <pre className="code-block">GET /.well-known/slotshield-test.json</pre>
          <pre className="code-block">{manifest}</pre>
          <pre className="code-block">{runRequest}</pre>
          <a href="https://gitlab.com/M-Nabeegh/slotshield/-/blob/rebuild/docs/test-adapter-contract.md" target="_blank" rel="noreferrer noopener">
            Full contract and response shape
          </a>
        </section>
        <section className="card card-body stack">
          <h2 className="section-title">Safety</h2>
          <ul className="bullets can">
            <li><CheckIcon size={14} />HTTPS only; private and local addresses are refused</li>
            <li><CheckIcon size={14} />Redirects must stay on the same host</li>
            <li><CheckIcon size={14} />Each run gets its own test namespace</li>
            <li><CheckIcon size={14} />Unknown fields in responses are dropped; evidence is capped at 240 characters</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}

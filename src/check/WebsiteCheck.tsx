import { useState, type FormEvent } from "react";
import { apiAvailable } from "../apiAvailable";
import { AlertIcon, CheckIcon, DashIcon } from "../ui/icons";
import type { WebsiteCheckResult } from "../../server/websiteAudit";

type State =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "error"; message: string }
  | { status: "done"; result: WebsiteCheckResult };

const headline: Record<WebsiteCheckResult["status"], string> = {
  verified: "Page reachable",
  attention: "Reachable, with something to look at",
  blocked: "Could not inspect this page",
};

export function WebsiteCheck() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    let target = url.trim();
    if (target && !/^[a-z]+:\/\//i.test(target)) {
      target = `https://${target}`;
      setUrl(target);
    }
    setState({ status: "checking" });
    try {
      const response = await fetch("/api/website-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await response.json();
      if (!response.ok || !("findings" in data)) {
        setState({ status: "error", message: data.message ?? "That address could not be checked." });
        return;
      }
      setState({ status: "done", result: data as WebsiteCheckResult });
    } catch {
      setState({ status: "error", message: "The checker did not respond. Is the dev server running?" });
    }
  };

  return (
    <div className="doc-page">
      <div className="stack">
        <header className="doc-intro">
          <h1>Check a booking page</h1>
          <p>
            Paste the public page patients use to book. SlotShield fetches it once, the way a browser would,
            and reports what is visible from outside. It never fills in or submits anything.
          </p>
        </header>

        <section className="card card-body stack" aria-label="Website check">
          {!apiAvailable ? (
            <p className="banner">
              <strong>Live checks need the local server.</strong> This hosted preview is static, so it can’t
              fetch other sites. Clone the repository and run <code>npm run dev</code> to use this page.
            </p>
          ) : null}
          <form className="form-row" onSubmit={submit}>
            <label className="visually-hidden" htmlFor="check-url">Booking page address</label>
            <input
              id="check-url"
              className="input"
              type="text"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              placeholder="https://yourclinic.com/book"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={!apiAvailable}
            />
            <button
              type="submit"
              className="button primary"
              style={{ height: 38 }}
              disabled={!apiAvailable || state.status === "checking" || !url.trim()}
            >
              {state.status === "checking" ? <span className="spinner" aria-hidden="true" /> : null}
              {state.status === "checking" ? "Checking" : "Check page"}
            </button>
          </form>
          {state.status === "error" ? <p className="form-error" role="alert">{state.message}</p> : null}
        </section>

        {state.status === "done" ? <Result result={state.result} /> : null}
      </div>

      <aside className="stack">
        <section className="card card-body stack">
          <h2 className="section-title">What a public check can tell you</h2>
          <ul className="bullets can">
            <li><CheckIcon size={14} />Whether the page answers over HTTPS, and how quickly</li>
            <li><CheckIcon size={14} />Where redirects end up, up to two hops</li>
            <li><CheckIcon size={14} />Links on the same site that look like booking pages</li>
          </ul>
          <h2 className="section-title">What it can’t</h2>
          <ul className="bullets cannot">
            <li><DashIcon size={14} />Whether two patients can claim one slot</li>
            <li><DashIcon size={14} />How holds, payments, and webhooks behave</li>
            <li><DashIcon size={14} />Anything behind a login</li>
          </ul>
          <p className="muted" style={{ fontSize: 13 }}>
            For those, model your traffic in the <a href="#/lab">Lab</a> or connect a{" "}
            <a href="#/staging">staging adapter</a>.
          </p>
        </section>
        <section className="card card-body stack">
          <h2 className="section-title">Limits</h2>
          <dl className="kv">
            <dt>Timeout</dt><dd>5 seconds</dd>
            <dt>Response size</dt><dd>128 KB</dd>
            <dt>Redirects</dt><dd>2</dd>
            <dt>Linked pages followed</dt><dd>up to 2</dd>
            <dt>Private networks</dt><dd>Refused</dd>
          </dl>
        </section>
      </aside>
    </div>
  );
}

function Result({ result }: { result: WebsiteCheckResult }) {
  return (
    <section className="card" aria-live="polite">
      <div className="card-body" style={{ display: "grid", gap: 4 }}>
        <p className="section-title">{headline[result.status]}</p>
        <p className="muted">{result.message}</p>
      </div>
      <div className="card-body" style={{ paddingTop: 0 }}>
        <dl className="kv">
          <dt>Final address</dt><dd>{result.finalUrl ?? "—"}</dd>
          <dt>HTTP status</dt><dd>{result.httpStatus ?? "—"}</dd>
          <dt>Response time</dt><dd>{result.responseTimeMs !== null ? `${result.responseTimeMs} ms` : "—"}</dd>
          <dt>Page title</dt><dd>{result.pageTitle ?? "—"}</dd>
        </dl>
      </div>
      <div className="findings" style={{ borderTop: "1px solid var(--hairline)" }}>
        {result.findings.map((finding) => (
          <div className="finding" key={finding.id}>
            <span className={`finding-icon ${finding.status}`}>
              {finding.status === "passed" ? <CheckIcon /> : finding.status === "attention" ? <AlertIcon /> : <DashIcon />}
            </span>
            <span className="finding-label">{finding.label}</span>
            <span className="faint" style={{ fontSize: 12 }}>
              {finding.status === "passed" ? "Passed" : finding.status === "attention" ? "Look at this" : "Not found"}
            </span>
            <span className="finding-detail">{finding.detail}</span>
          </div>
        ))}
      </div>
      {result.bookingLinks.length > 0 ? (
        <div className="card-body" style={{ borderTop: "1px solid var(--hairline)", display: "grid", gap: 8 }}>
          <p className="label">Booking pages found</p>
          {result.bookingLinks.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer noopener" style={{ overflowWrap: "anywhere" }}>
              {link.label} <span className="faint">{new URL(link.url).pathname}</span>
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}

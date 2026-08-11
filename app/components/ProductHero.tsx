import type { FormEvent } from "react";
import { IS_STATIC_PREVIEW } from "../lib/publicPreview";
import { SlotRail } from "./SlotRail";

export type ProductCheckState = "idle" | "checking" | "success" | "error";

export interface ProductHeroProps {
  websiteUrl: string;
  publicState: ProductCheckState;
  stagingOpen: boolean;
  onWebsiteUrlChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenStaging: () => void;
  onTryScenario: () => void;
}

export function ProductHero({
  websiteUrl,
  publicState,
  stagingOpen,
  onWebsiteUrlChange,
  onSubmit,
  onOpenStaging,
  onTryScenario,
}: ProductHeroProps) {
  const isChecking = publicState === "checking";
  const checkLabel = IS_STATIC_PREVIEW ? "Run synthetic check" : "Check site";
  const publicStatus = publicState === "success"
    ? "Verified"
    : publicState === "error"
      ? "Attention"
      : isChecking
        ? "Checking"
        : "Open";

  return (
    <section className="studio-hero" id="top" aria-labelledby="product-hero-title">
      <div className="studio-hero-copy">
        <p className="studio-kicker">Reliability checks for booking flows</p>
        <h1 id="product-hero-title">Catch booking failures before your customers do.</h1>
        <p className="studio-hero-description">
          Inspect the public surface of an appointment flow, understand what can
          be verified, and rehearse reliability failures without touching real
          bookings.
        </p>

        <form className="studio-check-form" id="website-audit-check" onSubmit={onSubmit}>
          <label htmlFor="website-url">
            {IS_STATIC_PREVIEW ? "Demo appointment URL" : "Public appointment URL"}
          </label>
          <div className="studio-check-row">
            <input
              id="website-url"
              name="website-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://clinic.example.com/book"
              value={websiteUrl}
              onChange={(event) => onWebsiteUrlChange(event.target.value)}
              aria-describedby="website-url-help"
              required
            />
            <button className="button button-primary" type="submit" disabled={isChecking}>
              {isChecking ? "Checking…" : checkLabel}
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <p className="studio-trust-note" id="website-url-help">
            {IS_STATIC_PREVIEW
              ? "GitHub Pages uses synthetic evidence only. Open the full preview for live public-surface checks."
              : "No sign-in. Public HTTPS pages only. No booking, payment, or customer actions."}
            <span>Synthetic data only.</span>
          </p>
        </form>
      </div>

      <aside className="preflight-console" aria-label="SlotShield preflight console">
        <div className="preflight-console-heading">
          <div>
            <p className="console-kicker">Preflight console</p>
            <strong>Choose a safe starting point.</strong>
          </div>
          <span className={`console-state console-state-${publicState}`}>
            {isChecking ? "Checking" : "Ready"}
          </span>
        </div>

        <div className="preflight-path is-active">
          <span className="preflight-path-index">01</span>
          <div>
            <strong>Public surface</strong>
            <span>Read-only inspection</span>
          </div>
          <span className="preflight-path-status">{publicStatus}</span>
        </div>

        <button className="preflight-path" type="button" onClick={onOpenStaging}>
          <span className="preflight-path-index">02</span>
          <div>
            <strong>Staging adapter</strong>
            <span>Test environment only</span>
          </div>
          <span className="preflight-path-status">{stagingOpen ? "Open" : "Optional"}</span>
        </button>

        <button className="preflight-path" type="button" onClick={onTryScenario}>
          <span className="preflight-path-index">03</span>
          <div>
            <strong>Fictional scenarios</strong>
            <span>Local deterministic rehearsal</span>
          </div>
          <span className="preflight-path-action">Try this scenario</span>
        </button>

        <SlotRail compact hasRun={false} selectedId="race" />
      </aside>
    </section>
  );
}

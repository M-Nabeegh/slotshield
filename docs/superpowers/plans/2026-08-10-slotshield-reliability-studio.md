# SlotShield Reliability Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild SlotShield's first-run experience as a restrained, premium Reliability Studio where a visitor understands the product, checks a public appointment URL, and can safely continue into staging or fictional failure rehearsal.

**Architecture:** Keep the deterministic domain engine, bounded website-check route, staging adapter route, and public-share behavior intact. Add presentational `ProductHero` and `HowItWorks` components, let `WebsiteAuditPanel` continue owning all network state, and make `page.tsx` a composition layer. Replace the current card-heavy visual hierarchy with a single preflight console, a sequential guide, compact evidence rows, and a trace-led simulator.

**Tech Stack:** React 19, TypeScript, Vinext, Vitest, Testing Library, semantic HTML, CSS, Playwright CLI for browser verification, and the existing Sites/Vite deployment path.

## Global Constraints

- Keep the public deployment URL stable: `https://slotshield-lab.jatnabeegh.chatgpt.site`.
- Keep the page account-free and preserve the public preview/share-link behavior.
- Public website checks remain HTTPS-only, bounded, read-only, timeout-limited, redirect-revalidated, and same-origin for discovered booking links.
- Staging requests remain test-only, use a temporary token only in the request body/header contract, never expose the token in DOM, URL, logs, screenshots, or share links, and clear it after success.
- Fictional scenarios remain local deterministic data; no booking, payment, calendar, customer, analytics, or production integrations may be added.
- Preserve the existing `WebsiteCheckResult`, `StagingAuditResult`, `ScenarioId`, and `ScenarioReport` contracts unless a contract change is proven necessary and covered by tests.
- Use the existing system-derived sans stack and mono fallback only for URLs, timestamps, HTTP metadata, response status, and trace metadata.
- Use signal violet for primary/selected state, protected mint for verified/accepted state, conflict coral for rejected/unsafe state, warm amber for attention, and graphite for neutral state.
- Avoid giant gradients, excessive glow, glassmorphism, nested cards, fake metrics, decorative charts, random badges, arbitrary gradient text, excessive shadows, and motion that does not clarify state.
- Keep controls keyboard reachable, visibly focused, at least 44px tall on touch layouts, and usable at 390px with no horizontal overflow.
- Respect `prefers-reduced-motion`; information and state must remain understandable without animation.
- Keep the footer attribution exactly: `Designed and engineered by Muhammad Nabeegh`.
- Keep dependencies unchanged unless a required behavior cannot be implemented with the existing React and CSS stack.
- End each meaningful slice with focused tests, `git diff --check`, a focused commit, and a push to `feat/slotshield-v1` plus the fast-forwarded `main` ref. Do not create empty commits solely to inflate history.

---

## Repository map and change boundaries

The implementation uses these focused boundaries:

- Create `app/components/ProductHero.tsx` — first-viewport thesis, public URL form presentation, trust boundary, and preflight console visual. It receives values and callbacks; it does not call `fetch`.
- Create `app/components/HowItWorks.tsx` — the three-step sequential client path with semantic links to the public check, staging path, and fictional rehearsal.
- Modify `app/components/WebsiteAuditPanel.tsx` — retain URL validation/request state, staging request state, and result contracts; compose the new hero and reorganize result/error/staging hierarchy.
- Modify `app/components/SlotRail.tsx` — preserve `hasRun` and `selectedId` behavior while supporting the compact preflight-console presentation.
- Modify `app/page.tsx` — compose the new audit/guide/scenario/workbench order, remove the old poster-like hero, and add the footer credit.
- Modify `app/components/ScenarioPicker.tsx` — change visual markup from raised cards to a compact selectable reliability-test list while preserving `aria-pressed` and `ScenarioId` selection.
- Modify `app/components/ScenarioBriefing.tsx`, `app/components/SimulationTimeline.tsx`, and `app/components/ReliabilityReport.tsx` — unify copy hierarchy and trace-led layout without changing report data or run behavior.
- Modify `app/globals.css` — replace old hero/audit/scenario surface rules with the Reliability Studio token, spacing, console, evidence, responsive, focus, and reduced-motion styles.
- Modify `app/page.test.tsx` — add first-viewport, guide, footer, evidence, error, staging-boundary, and focus behavior tests while preserving existing scenario and share-link coverage.
- Modify `tests/rendered-html.test.mjs` — assert the server-rendered Reliability Studio copy, guide, public-check action, and attribution.
- Modify `README.md` — present the project as a flagship reliability product with the public-check workflow and portfolio credit.

The existing `app/lib`, `app/api`, `app/domain`, and `app/lib/publicPreview.ts` contracts are read-only inputs to the UI work unless a test exposes a real defect.

## Task 1: Lock the Reliability Studio interaction contract with failing tests

**Files:**
- Modify: `app/page.test.tsx`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: current `Home`, `PUBLIC_PREVIEW_URL`, `WebsiteCheckResult`, and existing scenario/share-link behavior.
- Produces: failing tests that define the new first viewport, how-it-works path, result boundary, footer attribution, and server-rendered copy.

- [ ] **Step 1: Add the first-viewport and guide tests.**

```tsx
it("explains the product and puts the public check first", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", {
      name: "Find the booking failures customers never see.",
    }),
  ).toBeVisible();
  expect(
    screen.getByRole("textbox", { name: /public appointment url/i }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: /check site/i })).toBeVisible();
  expect(
    screen.getByText(/no sign-in\. public https pages only/i),
  ).toBeVisible();
  expect(screen.getByRole("heading", { name: /how it works/i })).toBeVisible();
  expect(screen.getByText(/add your public link/i)).toBeVisible();
  expect(screen.getByText(/review what was observed/i)).toBeVisible();
  expect(screen.getByText(/test staging safely/i)).toBeVisible();
});
```

- [ ] **Step 2: Add the footer-credit and result-boundary tests.**

```tsx
it("credits the product without competing with the main action", () => {
  render(<Home />);

  expect(
    screen.getByText("Designed and engineered by Muhammad Nabeegh"),
  ).toBeVisible();
});

it("separates observed evidence from behavior the public check cannot prove", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        status: "verified",
        requestedUrl: "https://clinic.example.com/",
        finalUrl: "https://clinic.example.com/",
        httpStatus: 200,
        responseTimeMs: 184,
        https: true,
        pageTitle: "Clinic",
        contentType: "text/html",
        bookingLinks: [],
        findings: [],
        message: "Public surface verified.",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );

  const user = userEvent.setup();
  render(<Home />);
  await user.type(
    screen.getByRole("textbox", { name: /public appointment url/i }),
    "https://clinic.example.com",
  );
  await user.click(screen.getByRole("button", { name: /check site/i }));

  expect(
    await screen.findByRole("heading", { name: "Public surface verified" }),
  ).toBeVisible();
  expect(screen.getByRole("heading", { name: /what we observed/i })).toBeVisible();
  expect(screen.getByText(/private booking behavior was not tested/i)).toBeVisible();
  expect(screen.getByRole("heading", { name: /next action/i })).toBeVisible();
});
```

- [ ] **Step 3: Update the server-rendered contract to the approved copy.** Keep the title, public preview, share action, `10:15`, scenario name, and `Check site` assertions; replace the old poster copy assertions with the new headline, guide step, public-boundary sentence, and footer credit:

```js
assert.match(html, /Find the booking failures customers never see\./i);
assert.match(html, /How it works/i);
assert.match(html, /Add your public link/i);
assert.match(html, /No sign-in\. Public HTTPS pages only/i);
assert.match(html, /Designed and engineered by Muhammad Nabeegh/i);
```

- [ ] **Step 4: Run the focused tests and confirm they fail against the current poster layout.**

Run: `npm run test -- app/page.test.tsx`

Expected: the existing simulator/share-link tests pass, while the new first-viewport, guide, result-boundary, and footer assertions fail because the new structure is not implemented.

- [ ] **Step 5: Commit the red test contract.**

```bash
git add app/page.test.tsx tests/rendered-html.test.mjs
git diff --cached --check
git commit -m "test: define Reliability Studio entry experience"
git push origin feat/slotshield-v1
git push origin HEAD:main
```

## Task 2: Build the first viewport, preflight console, and client guide

**Files:**
- Create: `app/components/ProductHero.tsx`
- Create: `app/components/HowItWorks.tsx`
- Modify: `app/components/WebsiteAuditPanel.tsx`
- Modify: `app/components/SlotRail.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `WebsiteAuditPanel`'s existing `websiteUrl`, public-check state, and event handlers; `ScenarioId` and `SlotRail`'s existing `hasRun`/`selectedId` props.
- Produces: `ProductHero({ websiteUrl, publicState, stagingOpen, onWebsiteUrlChange, onSubmit, onOpenStaging, onTryScenario })` and `HowItWorks()` presentational components. `ProductHero` never calls `fetch`.

- [ ] **Step 1: Define the presentational prop contract in `ProductHero.tsx`.**

```tsx
export type ProductCheckState = "idle" | "checking" | "success" | "error";

export interface ProductHeroProps {
  websiteUrl: string;
  publicState: ProductCheckState;
  stagingOpen: boolean;
  onWebsiteUrlChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onOpenStaging: () => void;
  onTryScenario: () => void;
}
```

- [ ] **Step 2: Render the hero thesis and attached URL action.** Use the exact user-facing copy: `Find the booking failures customers never see.`, supporting text explaining public inspection and fictional rehearsal, a real `label` named `Public appointment URL`, placeholder `https://clinic.example.com/book`, and the action label `Check site`. Keep the loading button dimensions stable and put the trust note directly under the form:

```tsx
<p className="studio-kicker">Appointment reliability, before production</p>
<h1>Find the booking failures customers never see.</h1>
<p className="studio-hero-description">
  Inspect the public surface of an appointment flow, understand what can be
  verified, and rehearse reliability failures without touching real bookings.
</p>
<p className="studio-trust-note">
  No sign-in. Public HTTPS pages only. No booking, payment, or customer actions.
</p>
```

- [ ] **Step 3: Add the preflight console as one instrument with three quiet paths.** The active public row derives from `publicState`; the staging row shows `Test-only` and calls `onOpenStaging`; the fictional row calls `onTryScenario`. Do not render three equal marketing cards. Keep `SlotRail` as a compact slot signal inside the fictional path so the existing `10:15` accessibility contract remains visible:

```tsx
<aside className="preflight-console" aria-label="SlotShield preflight console">
  <div className="preflight-console-heading">
    <span>Preflight console</span>
    <span>{publicState === "checking" ? "Checking" : "Ready"}</span>
  </div>
  <div className="preflight-path is-active">
    <span className="preflight-path-index">01</span>
    <div><strong>Public surface</strong><span>Read-only inspection</span></div>
    <span className="preflight-path-status">{publicState === "success" ? "Verified" : "Open"}</span>
  </div>
  <button className="preflight-path" type="button" onClick={onOpenStaging}>
    <span className="preflight-path-index">02</span>
    <div><strong>Staging adapter</strong><span>Test environment only</span></div>
    <span className="preflight-path-status">{stagingOpen ? "Open" : "Optional"}</span>
  </button>
  <button className="preflight-path" type="button" onClick={onTryScenario}>
    <span className="preflight-path-index">03</span>
    <div><strong>Fictional scenarios</strong><span>Local deterministic rehearsal</span></div>
    <span className="preflight-path-status">Ready</span>
  </button>
  <SlotRail compact hasRun={false} selectedId="race" />
</aside>
```

- [ ] **Step 4: Add `HowItWorks` with sequential links rather than feature cards.** Use `ol` semantics, restrained dividers, and these exact steps: `01 — Add your public link`, `02 — Review what was observed`, `03 — Test staging safely`. Link to `#website-audit-check`, `#public-check-result`, and `#staging-audit` respectively.

- [ ] **Step 5: Wire the components without moving network logic.** `WebsiteAuditPanel` passes its existing state and handlers into `ProductHero`; `page.tsx` removes the old hero section, renders `WebsiteAuditPanel` followed by `HowItWorks`, then the failure library. `checkWebsite`, `runStagingAudit`, token clearing, and result state stay in `WebsiteAuditPanel`.

- [ ] **Step 6: Add the `compact?: boolean` prop to `SlotRail` without changing its required props.** The compact branch keeps the accessible label `10:15 booking slot rail`, the protected slot time, and accepted/conflict signal meaning while removing the old large poster treatment.

- [ ] **Step 7: Run the focused page tests and commit the first-viewport slice.**

Run: `npm run test -- app/page.test.tsx`

Expected: the new entry, guide, and footer tests may still fail until the footer and result slices land; the existing share-link, scenario selection, and run-report tests must remain green.

```bash
git add app/components/ProductHero.tsx app/components/HowItWorks.tsx app/components/WebsiteAuditPanel.tsx app/components/SlotRail.tsx app/page.tsx
git diff --cached --check
git commit -m "feat: add Reliability Studio entry surface"
git push origin feat/slotshield-v1
git push origin HEAD:main
```

## Task 3: Rebuild public-check results around evidence and boundaries

**Files:**
- Modify: `app/components/WebsiteAuditPanel.tsx`
- Modify: `app/page.test.tsx`
- Modify: `app/lib/websiteAudit.ts` only if a test proves a missing safe field is required; otherwise leave the API contract unchanged.

**Interfaces:**
- Consumes: `WebsiteCheckResult` fields `status`, `requestedUrl`, `finalUrl`, `httpStatus`, `responseTimeMs`, `https`, `pageTitle`, `contentType`, `bookingLinks`, `findings`, and `message`.
- Produces: result markup with headings `What we observed`, `Key facts`, `Findings`, `What this check cannot prove`, and `Next action`; no invented metrics.

- [ ] **Step 1: Add result-section assertions for evidence and limits.** Extend the successful-result test to assert `HTTPS`, `HTTP status`, `Response`, `Booking links`, `Public booking behavior was not tested`, and the staging/fake-scenario next actions.

- [ ] **Step 2: Replace the result metrics grid with a compact definition list.** Render only facts available in the response contract:

```tsx
<dl className="audit-fact-list" aria-label="Public check facts">
  <div><dt>HTTPS</dt><dd>{publicResult.https ? "Active" : "Missing"}</dd></div>
  <div><dt>HTTP status</dt><dd>{publicResult.httpStatus ?? "Not available"}</dd></div>
  <div><dt>Response</dt><dd>{publicResult.responseTimeMs === null ? "Not available" : `${publicResult.responseTimeMs} ms`}</dd></div>
  <div><dt>Booking links</dt><dd>{publicResult.bookingLinks.length} found</dd></div>
  <div><dt>Content</dt><dd>{publicResult.contentType?.includes("text/html") ? "HTML page" : publicResult.contentType ?? "Not available"}</dd></div>
</dl>
```

- [ ] **Step 3: Make the boundary a deliberate section, not a footer disclaimer.** Add a visible `What this check cannot prove` block with concise copy: `Private booking behavior was not tested. This check does not book a slot, process payment, validate concurrency, or inspect authenticated flows.` Keep the existing safe route behavior and do not imply a successful appointment.

- [ ] **Step 4: Give errors a clear three-part explanation.** Keep the entered URL after failure and render a `role="alert"` with what happened, why SlotShield stopped, and the next correction. Use the sanitized route/client message; never render an exception stack or token.

- [ ] **Step 5: Add stable IDs and accessible async semantics.** Set `id="website-audit-check"` on the public form region, `id="public-check-result"` on the result region, and `id="staging-audit"` on the staging panel. Use `aria-live="polite"` for result summaries. Do not move focus to the result heading automatically; the visitor's focus remains on the action they invoked.

- [ ] **Step 6: Run the website-check and page tests, then commit the evidence slice.**

Run: `npm run test -- app/page.test.tsx app/lib/websiteAudit.test.ts app/api/website-check/route.test.ts`

Expected: all existing URL-safety/route tests remain green, successful results show evidence and limits, and error copy remains actionable without exposing implementation details.

```bash
git add app/components/WebsiteAuditPanel.tsx app/page.test.tsx
git diff --cached --check
git commit -m "feat: clarify public check evidence and limits"
git push origin feat/slotshield-v1
git push origin HEAD:main
```

## Task 4: Make scenarios and the workbench read as reliability tests

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/components/ScenarioPicker.tsx`
- Modify: `app/components/ScenarioBriefing.tsx`
- Modify: `app/components/SimulationTimeline.tsx`
- Modify: `app/components/ReliabilityReport.tsx`
- Modify: `app/page.test.tsx`

**Interfaces:**
- Consumes: `ScenarioDefinition`, `ScenarioId`, and `ScenarioReport` without changing domain output.
- Produces: a compact selectable reliability-test navigator, a trace-led workbench, and the same run/report behavior.

- [ ] **Step 1: Add copy assertions for the rehearsal section.** Assert `Rehearse a failure`, `Run deterministic failure scenarios locally`, `Risk`, `Trigger`, `Protection`, and `Final state` while preserving the existing title-selection and report tests.

- [ ] **Step 2: Replace the four raised scenario cards with a semantic list.** Keep one `button` per `ScenarioId`, `aria-pressed`, category, title, description, and selection callback. Use a list row with a quiet selected rule and a single signal marker instead of gradient backgrounds, large shadows, or decorative arrows.

- [ ] **Step 3: Reword the briefing to tell the story in order.** Use the labels `Selected risk`, `Trigger`, and `Expected protection`; keep the existing scenario `risk` and `protection` values and the `Run scenario` action.

- [ ] **Step 4: Keep the event trace visually central.** Preserve the ordered `ol`, event timestamps, actor, message, and outcome badge. Reduce container decoration and use the vertical event rail plus signal colors to explain accepted, rejected, ignored, and received outcomes.

- [ ] **Step 5: Keep the completed report contract but simplify hierarchy.** Preserve score, final-state counts, recommendation, and share URL. Use the report as the final answer to `What happened?`, not as a fake business dashboard.

- [ ] **Step 6: Run interaction tests and commit the rehearsal slice.**

Run: `npm run test -- app/page.test.tsx app/domain/bookingEngine.test.ts app/domain/scenarios.test.ts`

```bash
git add app/page.tsx app/components/ScenarioPicker.tsx app/components/ScenarioBriefing.tsx app/components/SimulationTimeline.tsx app/components/ReliabilityReport.tsx app/page.test.tsx
git diff --cached --check
git commit -m "feat: refine reliability rehearsal workflow"
git push origin feat/slotshield-v1
git push origin HEAD:main
```

## Task 5: Apply the premium visual system and responsive layout

**Files:**
- Modify: `app/globals.css`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: the class names from Tasks 2–4 and current color/type variables.
- Produces: the complete Reliability Studio visual language at 1280px, 1024px, 768px, and 390px without horizontal overflow.

- [ ] **Step 1: Replace the old poster tokens and ambient effects.** Keep porcelain, graphite, signal violet, protected mint, conflict coral, and warm amber; lower or remove the current full-width grid veil, two auroras, large headline scale, radial card backgrounds, and repeated shadows. Add only shared surface/border/spacing values needed by the new components.

- [ ] **Step 2: Style the first viewport as a balanced, non-symmetrical composition.** Give the left action column a controlled headline width and readable line length; give the right console a single elevated boundary with quiet path rows. Keep the URL field and `Check site` button compositionally attached and at least 49px tall.

- [ ] **Step 3: Style the sequential guide with purposeful numbering and dividers.** Use an `ol` grid on desktop and a vertical stack on mobile. Do not turn steps into three equal feature cards.

- [ ] **Step 4: Style evidence, boundary, errors, and staging as information surfaces.** Use subtle dividers and mono metadata only where it represents machine-readable values. Use mint/coral/amber signals alongside text labels so color is never the only state cue.

- [ ] **Step 5: Style the scenario navigator, workbench, and report with one radius/elevation system.** Favor line work and spacing over colored containers. Keep the event timeline visually dominant and make the report feel like a deterministic answer rather than a metrics dashboard.

- [ ] **Step 6: Add footer attribution and concise public boundary copy.** Render the credit below the no-real-actions sentence:

```tsx
<p className="footer-credit">Designed and engineered by Muhammad Nabeegh</p>
```

- [ ] **Step 7: Add responsive and reduced-motion rules.** At 1024px collapse the hero/console as designed; at 768px stack the guide and audit evidence; at 390px stack URL input/button, shorten/truncate long URLs safely, keep controls touch-sized, and disable transform/reveal motion under `prefers-reduced-motion: reduce`.

- [ ] **Step 8: Run lint and the focused page tests, then commit the visual-system slice.**

Run: `npm run lint && npm run test -- app/page.test.tsx`

```bash
git add app/globals.css app/page.tsx
git diff --cached --check
git commit -m "style: polish Reliability Studio surfaces"
git push origin feat/slotshield-v1
git push origin HEAD:main
```

## Task 6: Verify accessibility, errors, staging boundaries, and mobile behavior

**Files:**
- Modify: `app/page.test.tsx`
- Modify: `app/components/WebsiteAuditPanel.tsx` only for behavior exposed by tests.
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: the completed UI and existing API test contracts.
- Produces: regression coverage for keyboard focus, result semantics, safe errors, staging-token handling, server-rendered copy, and the required footer credit.

- [ ] **Step 1: Add a focus-preservation test for async results.** After submitting the public form, assert that the action remains the active element while the live result appears; the result must be announced through `aria-live` rather than stealing focus.

- [ ] **Step 2: Add invalid/blocked URL and timeout-style client-state tests.** Stub the route response with `{ status: 400, message: "Use an HTTPS website address." }` and assert a `role="alert"` contains the safe correction, preserves the typed URL, and does not contain a stack trace.

- [ ] **Step 3: Add staging token privacy coverage.** Open the staging form, type a token, submit a mocked successful response, and assert the token input is cleared and the token does not appear in `document.body.textContent`, rendered links, or the staging result evidence.

- [ ] **Step 4: Add semantic-control assertions.** Check that the public URL has a real label, each scenario has an accessible name and `aria-pressed`, the guide uses `ol`, and the footer credit is present in server-rendered HTML.

- [ ] **Step 5: Run the complete automated suite and commit the verification slice.**

Run: `npm run test && npm run lint && npm run test:site`

Expected: Vitest, ESLint, and the server-rendered HTML test all pass with no new warnings.

```bash
git add app/page.test.tsx app/components/WebsiteAuditPanel.tsx tests/rendered-html.test.mjs
git diff --cached --check
git commit -m "test: harden studio accessibility and boundaries"
git push origin feat/slotshield-v1
git push origin HEAD:main
```

## Task 7: Make the repository presentation employer-ready

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the implemented public-check flow, staging adapter spec, public preview URL, and scenario descriptions.
- Produces: README copy that explains the product in one minute, documents what is verified and not verified, identifies the safe staging path, lists tests, and includes `Designed and engineered by Muhammad Nabeegh`.

- [ ] **Step 1: Rewrite the opening paragraph to match the first viewport.** Lead with inspecting a public appointment surface, separating observed facts from unverified behavior, and rehearsing fictional failures.

- [ ] **Step 2: Document the visitor flow as three numbered steps.** Use the same labels as the UI: `Add your public link`, `Review what was observed`, and `Test staging safely`.

- [ ] **Step 3: Keep security and data-boundary documentation explicit.** Preserve the existing no-account/no-customer-data/no-production-mutation language, public URL validation limits, staging token behavior, and deterministic scenario contract.

- [ ] **Step 4: Add the portfolio credit and verification commands.** Keep the live URL, project structure, `npm run test`, `npm run lint`, and `npm run test:site` commands accurate.

- [ ] **Step 5: Run the site test and commit the documentation slice.**

Run: `npm run test:site`

```bash
git add README.md
git diff --cached --check
git commit -m "docs: present SlotShield as a portfolio product"
git push origin feat/slotshield-v1
git push origin HEAD:main
```

## Task 8: Perform browser QA, deploy, and record evidence

**Files:**
- Modify only files exposed by browser QA fixes; each fix gets its own focused commit before deployment.
- Read: `.openai/hosting.json`

**Interfaces:**
- Consumes: the tested local build and existing public Sites project.
- Produces: browser-verified screenshots/notes, a successful production build, a clean dependency audit, and an updated public preview at the stable URL.

- [ ] **Step 1: Start the local app and inspect the first viewport at desktop widths.** Run `npm run dev -- --host localhost`, open with the Playwright CLI, and inspect at 1280px and 1440px. Confirm the headline, URL form, console, and public/no-sign-in boundary are visible without the old giant poster treatment.

- [ ] **Step 2: Inspect the full public-check flow.** Submit a safe public URL, capture the successful result, confirm evidence rows and the explicit `cannot prove` section, open staging, and verify the temporary-token copy is test-only. Exercise an invalid/private URL response and confirm the error explains what happened, why it stopped, and the next action.

- [ ] **Step 3: Inspect the fictional rehearsal flow.** Select all four scenarios, run at least the race and time-zone modes, and confirm the trace remains the visual center with the same deterministic events and final report.

- [ ] **Step 4: Inspect 1024px, 768px, and 390px.** Confirm no horizontal overflow, URL input/button usability, readable console summary, touch-sized scenario selection, timeline readability, wrapped/truncated long URLs, and footer credit visibility.

- [ ] **Step 5: Inspect keyboard focus and reduced motion.** Tab through the header, URL form, guide links, staging controls, scenario buttons, and share action. Confirm visible focus rings. Use Playwright `page.emulateMedia({ reducedMotion: "reduce" })` and confirm all content/state remains available without transition-dependent meaning.

- [ ] **Step 6: Run the release checks.**

```bash
npm run test
npm run lint
npm run test:site
npm audit --omit=dev --json
git diff --check
git status --short
```

Expected: all tests pass, the production dependency audit reports zero production vulnerabilities, `git diff --check` is clean, and the worktree is clean before deployment.

- [ ] **Step 7: Deploy the tested build through the existing Sites project.** Use the existing `.openai/hosting.json` project ID and the Sites hosting workflow; keep the public access mode and stable URL unchanged. Do not expose deployment bypass tokens or environment secrets in commits, logs, screenshots, or the final response.

- [ ] **Step 8: Reopen the live URL and repeat the focused browser checks.** Verify HTTP 200, the new first-viewport headline, `Check site`, guide, footer credit, public result, staging boundary, scenario run, and 390px no-overflow behavior against the deployed site. Commit any required post-deploy fix separately and push it before redeploying.

- [ ] **Step 9: Record the final handoff.** Report files changed, major design decisions, preserved contracts, accessibility changes, responsive fixes, test commands/results, deployment version/URL, and browser evidence. Do not claim completion while a required check is failing.

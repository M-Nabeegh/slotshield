# SlotShield Reliability Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing SlotShield simulator into a polished, SaaS-style public workspace where an unauthenticated visitor can test all four deterministic booking scenarios, understand the guardrail, and copy the public link.

**Architecture:** Keep `app/domain` as the pure deterministic simulation engine. Refactor the single page into focused client components for the public access bar, observatory slot rail, scenario picker/briefing, event timeline, and reliability report; `app/page.tsx` owns only selected scenario, run state, and clipboard state. Replace the dark dashboard styling with a porcelain/graphite SaaS workspace while preserving the existing Vinext/Worker build and public deployment URL.

**Tech Stack:** React 19, TypeScript, Vinext, Vitest, React Testing Library, CSS, and the bundled Sites Vite plugin.

## Global Constraints

- Use fictional booking data only; do not add booking, payment, calendar, authentication, customer-data, or analytics integrations.
- Keep all four scenario IDs and their deterministic `runScenario(id)` reports unchanged.
- The first viewport must read as a working SaaS product workspace, not a portfolio mockup.
- Normal visitors must be able to run a scenario without signing in or uploading data.
- Keep the public URL stable: `https://slotshield-lab.jatnabeegh.chatgpt.site`.
- Keep primary controls at least 44px tall on touch layouts and preserve visible keyboard focus.
- Use the design tokens from the approved spec: Porcelain `#F5F4EF`, Graphite `#11151D`, Signal violet `#6D63FF`, Protected mint `#37D5B0`, Conflict coral `#F06B68`, and Warm amber `#E9A943`.
- Use local system typography stacks: `Avenir Next`/`SF Pro Display`, `SF Pro Text`, and `SF Mono`, with system fallbacks.
- Never commit credentials, access tokens, private Sites credentials, or generated deployment archives.
- Every completed task ends with automated checks, a focused Git commit, and a push to the configured GitHub branch; if `origin` is not configured yet, retain the commit locally and push it immediately after the user confirms the target repository.

---

### Task 1: Add the public preview contract and behavioral tests

**Files:**
- Create: `app/lib/publicPreview.ts`
- Modify: `app/page.test.tsx`

**Interfaces:**
- Produces: `PUBLIC_PREVIEW_URL: string` with the exact public deployment URL.
- Produces: tests for the public-preview badge, canonical URL, clipboard success state, clipboard fallback state, and the existing scenario/run behavior.

- [ ] **Step 1: Add failing tests for public client access and copy behavior**

```tsx
it("shows an account-free public preview and canonical share URL", () => {
  render(<Home />);

  expect(screen.getByText("PUBLIC PREVIEW")).toBeVisible();
  expect(screen.getByText(PUBLIC_PREVIEW_URL)).toBeVisible();
  expect(screen.getByText(/no account required/i)).toBeVisible();
});

it("copies the public URL and confirms the action", async () => {
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(<Home />);

  await user.click(screen.getByRole("button", { name: /copy share link/i }));

  expect(writeText).toHaveBeenCalledWith(PUBLIC_PREVIEW_URL);
  expect(screen.getByText("Link copied")).toBeVisible();
});

it("offers a selectable manual-copy fallback when clipboard access fails", async () => {
  const user = userEvent.setup();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
  render(<Home />);

  await user.click(screen.getByRole("button", { name: /copy share link/i }));

  expect(screen.getByText("Select and copy this link")).toBeVisible();
});
```

- [ ] **Step 2: Run only the new tests and verify they fail for the missing public surface**

Run: `npm run test -- app/page.test.tsx`

Expected: FAIL because the current page has no `PUBLIC PREVIEW` badge, canonical URL, or copy action.

- [ ] **Step 3: Add the exact public URL constant**

```ts
export const PUBLIC_PREVIEW_URL =
  "https://slotshield-lab.jatnabeegh.chatgpt.site";
```

- [ ] **Step 4: Run the focused test again and record the remaining UI failure**

Run: `npm run test -- app/page.test.tsx`

Expected: FAIL only on the unimplemented page controls; the import resolves.

- [ ] **Step 5: Commit the public-preview test contract**

```bash
git add app/lib/publicPreview.ts app/page.test.tsx
git diff --cached --check
git commit -m "test: define public SlotShield preview behavior"
git push
```

The push command uses the configured branch once `origin` exists; if it reports that no remote is configured, keep this commit and push it after repository setup.

### Task 2: Build the SaaS product shell and public access bar

**Files:**
- Create: `app/components/PublicAccessBar.tsx`
- Create: `app/components/SlotShieldMark.tsx`
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`

**Interfaces:**
- Consumes: `PUBLIC_PREVIEW_URL`.
- Produces: `PublicAccessBar({ shareUrl }: { shareUrl: string })` with `PUBLIC PREVIEW`, `Copy share link`, and a manual-copy fallback.
- Produces: `SlotShieldMark({ compact?: boolean })` for the product header/footer identity.

- [ ] **Step 1: Implement only the public access bar needed by the failing tests**

```tsx
type CopyState = "idle" | "copied" | "manual";

export function PublicAccessBar({ shareUrl }: { shareUrl: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function copyShareLink() {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopyState("copied");
        window.setTimeout(() => setCopyState("idle"), 2000);
        return;
      } catch {
        // Fall through to a visible manual-copy path.
      }
    }
    setCopyState("manual");
  }

  return (
    <div className="public-access-bar">
      <span className="public-access-status">PUBLIC PREVIEW</span>
      <span className="public-access-url">{shareUrl}</span>
      <button type="button" onClick={copyShareLink}>
        {copyState === "copied" ? "Link copied" : "Copy share link"}
      </button>
      {copyState === "manual" ? (
        <span role="status">Select and copy this link</span>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Add the product header and wire the component into `Home`**

Use `SlotShieldMark`, `Reliability lab / Booking flows`, `Simulator`, `PUBLIC PREVIEW`, and `PublicAccessBar`. Keep the share URL constant so local preview and production both point clients to the stable public sandbox.

- [ ] **Step 3: Run the public-access tests and the existing scenario tests**

Run: `npm run test -- app/page.test.tsx`

Expected: PASS for public preview/copy/manual fallback, scenario selection, and reliability-report reveal.

- [ ] **Step 4: Commit the functional SaaS shell**

```bash
git add app/components/PublicAccessBar.tsx app/components/SlotShieldMark.tsx app/page.tsx app/page.test.tsx
git diff --cached --check
git commit -m "feat: add public SaaS access shell"
git push
```

### Task 3: Add the observatory slot rail and scenario picker

**Files:**
- Create: `app/components/SlotRail.tsx`
- Create: `app/components/ScenarioPicker.tsx`
- Create: `app/components/ScenarioBriefing.tsx`
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`

**Interfaces:**
- `SlotRail({ hasRun, selectedId }: { hasRun: boolean; selectedId: ScenarioId })` renders the fixed `10:15` slot with accepted mint and conflict coral signals.
- `ScenarioPicker({ selectedId, onSelect }: { selectedId: ScenarioId; onSelect: (id: ScenarioId) => void })` renders four accessible pressed buttons.
- `ScenarioBriefing({ scenario, report, onRun }: { scenario: ScenarioDefinition; report: ScenarioReport; onRun: () => void })` renders plain-language risk, protection, and the primary `Run scenario` action.

- [ ] **Step 1: Add failing tests for the SaaS first-run flow**

```tsx
it("presents the slot rail and a clear first-run scenario action", () => {
  render(<Home />);

  expect(screen.getByText("10:15")).toBeVisible();
  expect(screen.getByRole("button", { name: /try this scenario/i })).toBeVisible();
  expect(screen.getByText(/synthetic data/i)).toBeVisible();
});

it("keeps all four scenario modes selectable", async () => {
  const user = userEvent.setup();
  render(<Home />);

  await user.click(screen.getByRole("button", { name: /time-zone mismatch/i }));

  expect(screen.getByRole("heading", { name: "Time-zone mismatch" })).toBeVisible();
  expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
});
```

- [ ] **Step 2: Run the new tests and verify they fail against the old dashboard**

Run: `npm run test -- app/page.test.tsx`

Expected: FAIL because the existing hero has no slot rail or `Try this scenario` control.

- [ ] **Step 3: Implement `SlotRail`, `ScenarioPicker`, and `ScenarioBriefing` with semantic buttons and labels**

Keep scenario selection transient in `Home`; selecting a new scenario must set `hasRun` to `false` and must not change domain data.

- [ ] **Step 4: Run focused page tests and verify the first-run flow passes**

Run: `npm run test -- app/page.test.tsx`

Expected: PASS for the slot rail, first-run CTA, scenario selection, public access, and copy behavior.

- [ ] **Step 5: Commit the observatory entry experience**

```bash
git add app/components/SlotRail.tsx app/components/ScenarioPicker.tsx app/components/ScenarioBriefing.tsx app/page.tsx app/page.test.tsx
git diff --cached --check
git commit -m "feat: add SlotShield observatory entry flow"
git push
```

### Task 4: Extract the event trace and reliability report

**Files:**
- Create: `app/components/SimulationTimeline.tsx`
- Create: `app/components/ReliabilityReport.tsx`
- Create: `app/components/Metric.tsx`
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`

**Interfaces:**
- `SimulationTimeline({ report, hasRun }: { report: ScenarioReport; hasRun: boolean })` renders ordered events with outcome badges and stable timestamps.
- `ReliabilityReport({ report, shareUrl }: { report: ScenarioReport; shareUrl: string })` renders score, final state, recommendation, and a share panel containing the same public URL.
- `Metric({ value, label }: { value: number; label: string })` formats final-state counts.

- [ ] **Step 1: Add failing tests for the run-complete report contract**

```tsx
it("shows the deterministic trace and operational report after a run", async () => {
  const user = userEvent.setup();
  render(<Home />);

  await user.click(screen.getByRole("button", { name: /run scenario/i }));

  expect(screen.getByRole("heading", { name: /simulation complete/i })).toBeVisible();
  expect(screen.getByText("TRACE / RACE")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Reliability report" })).toBeVisible();
  expect(screen.getByText(/unique active-slot constraint/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the new report test and verify it fails before extraction**

Run: `npm run test -- app/page.test.tsx`

Expected: FAIL because the current labels and report composition do not match the SaaS result contract.

- [ ] **Step 3: Implement `SimulationTimeline`, `Metric`, and `ReliabilityReport`**

Render `Ready to test` before running and `Simulation complete` after running. Keep event outcome colors mapped to received violet, accepted mint, rejected coral, and ignored amber.

- [ ] **Step 4: Run all unit and component tests**

Run: `npm run test`

Expected: PASS for all domain behavior, scenario order, selection, public access, copy fallback, event trace, and report tests.

- [ ] **Step 5: Commit the simulation result surface**

```bash
git add app/components/SimulationTimeline.tsx app/components/ReliabilityReport.tsx app/components/Metric.tsx app/page.tsx app/page.test.tsx
git diff --cached --check
git commit -m "feat: add observatory trace and reliability report"
git push
```

### Task 5: Replace the visual system with responsive SaaS styling

**Files:**
- Replace: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `README.md`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: the semantic class names from Tasks 2–4.
- Produces: a porcelain/graphite SaaS workspace with two-column desktop layout, scrollable tablet scenario row, one-column phone layout, 44px controls, visible focus rings, and reduced-motion support.

- [ ] **Step 1: Update the server-render test contract for SaaS copy**

```js
assert.match(html, /Rehearse the moment booking trust breaks\./i);
assert.match(html, /PUBLIC PREVIEW/i);
assert.match(html, /No account required/i);
assert.match(html, /Copy share link/i);
assert.match(html, /Reliability lab \/ Booking flows/i);
```

- [ ] **Step 2: Run the server-render test and verify the old copy fails**

Run: `npm run test:site`

Expected: FAIL on the new SaaS copy assertions while the build still completes.

- [ ] **Step 3: Replace dark tokens and layout rules with the approved observatory system**

Use these required CSS tokens:

```css
:root {
  --porcelain: #f5f4ef;
  --graphite: #11151d;
  --signal-violet: #6d63ff;
  --protected-mint: #37d5b0;
  --conflict-coral: #f06b68;
  --warm-amber: #e9a943;
}
```

Implement the slot rail with CSS lines/dots, not a decorative stock illustration. Use `@media (max-width: 960px)` for the stacked workspace and `@media (max-width: 640px)` for one-column cards, a sticky mobile run action, and no horizontal overflow. Use `@media (prefers-reduced-motion: reduce)` to disable transforms and reveal animation.

- [ ] **Step 4: Remove remote font dependencies from the layout**

Remove `next/font/google` imports and use the local stacks from the spec:

```css
body {
  font-family: "SF Pro Text", "Avenir Next", -apple-system, BlinkMacSystemFont, sans-serif;
}
```

Keep metadata title, description, favicon, and social preview intact.

- [ ] **Step 5: Update README with SaaS positioning, public testing, safety, and commit-friendly development commands**

Document that anyone can open the public preview, click `Try this scenario`, and run fake data without an account; explicitly state that no real bookings, payments, patient records, or integrations are touched.

- [ ] **Step 6: Run lint, unit tests, server-render test, and whitespace checks**

Run: `npm run lint && npm run test && npm run test:site && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 7: Commit the responsive SaaS visual system**

```bash
git add app/globals.css app/layout.tsx README.md tests/rendered-html.test.mjs
git diff --cached --check
git commit -m "feat: redesign SlotShield as a SaaS observatory"
git push
```

### Task 6: Verify desktop/mobile behavior and publish the public version

**Files:**
- Verify: `app/page.tsx`
- Verify: `app/components/*.tsx`
- Verify: `app/globals.css`
- Verify: `README.md`

**Interfaces:**
- Verifies: a public visitor can open the deployment, run each scenario, copy the share URL, and use the same flow at desktop and phone widths.

- [ ] **Step 1: Run the complete local validation suite**

Run: `npm run lint && npm run test && npm run test:site && npm audit --omit=dev --json`

Expected: lint, tests, and site render pass; production audit reports zero vulnerabilities.

- [ ] **Step 2: Start the local dev server and run a browser smoke test**

Run: `npm run dev -- --host 127.0.0.1`

In a browser at the printed URL, verify at 1440px and 390px widths:

1. Header shows `PUBLIC PREVIEW`, `Simulator`, and `Copy share link`.
2. Hero slot rail shows `10:15`, accepted mint, and conflict coral signals.
3. A visitor can select each of the four scenarios and run it without authentication.
4. The trace and report update after each run.
5. Copy success shows `Link copied`; clipboard fallback shows `Select and copy this link`.
6. No horizontal scroll or clipped controls appears on the phone viewport.

- [ ] **Step 3: Run the React best-practices review and fix only actionable findings**

Review every edited TSX file for stable keys, hook correctness, accessible labels, unnecessary rerenders, and component boundaries. Re-run `npm run lint && npm run test` after any fix.

- [ ] **Step 4: Commit verification-only fixes**

```bash
git add app README.md tests
git diff --cached --check
git commit -m "test: verify SlotShield public visitor flow"
git push
```

- [ ] **Step 5: Package and save the verified version through Sites**

Use the existing project ID from `.openai/hosting.json`, package the repository with `/Users/nabeegh/.codex/plugins/cache/openai-bundled/sites/0.1.34/scripts/package-site.sh`, create a new source-repository credential only for the push, and save the exact verified commit SHA as a new version. Never print or persist the credential.

- [ ] **Step 6: Deploy the saved version publicly and verify the live URL**

Deploy the saved version with public access preserved, poll until Sites reports `succeeded`, then verify the public URL returns HTTP 200 and the rendered page contains `PUBLIC PREVIEW`, `No account required`, `Double-booking race`, and `Copy share link`. Confirm that no sign-in prompt appears.

- [ ] **Step 7: Record the deployment handoff in a final focused commit**

```bash
git add README.md
git diff --cached --check
git commit -m "docs: document SlotShield public preview"
git push
```

Add the verified public URL and local test commands to the README; do not add deployment credentials or private IDs.

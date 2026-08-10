# SlotShield Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, public, fake-data-only website that simulates four booking-system reliability failures and explains their protections.

**Architecture:** A Vite React application renders a dashboard around a pure TypeScript simulation engine. Static scenario definitions describe the user-facing copy, while `runScenario()` applies deterministic booking rules and returns a report for the UI and test suite.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Testing Library, CSS, Lucide React icons.

## Global Constraints

- Use fictional booking data only; no external booking, calendar, payment, or authentication integration.
- Keep all scenario rules deterministic and independently testable without a browser.
- Call out every outcome as a simulation in the interface and README.
- Build an accessible responsive interface with keyboard-selectable scenario controls.
- Keep the public repository free of credentials, live URLs, personal data, and payment fields.

---

### Task 1: Bootstrap the React and test environment

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: `npm run dev`, `npm run test`, `npm run build`, and a React root mounted at `#root`.

- [ ] **Step 1: Create the package manifest and tool configuration**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Install dependencies and run the empty test command**

Run: `npm install && npm run test`

Expected: Vitest starts and exits successfully with no test files before domain behavior exists.

- [ ] **Step 3: Commit the bootstrap**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.tsx src/test/setup.ts
git commit -m "chore: bootstrap SlotShield web app"
```

### Task 2: Implement the deterministic booking simulation with tests first

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/scenarios.ts`
- Create: `src/domain/bookingEngine.ts`
- Create: `src/domain/bookingEngine.test.ts`

**Interfaces:**
- Produces: `type ScenarioId = 'race' | 'expired-hold' | 'duplicate-callback' | 'timezone'`.
- Produces: `function runScenario(id: ScenarioId): ScenarioReport`.
- Produces: `const scenarios: ScenarioDefinition[]`.

- [ ] **Step 1: Write a failing race-condition test**

```ts
it('confirms only one booking when two requests claim the same slot', () => {
  const report = runScenario('race');
  expect(report.finalState.confirmedBookings).toBe(1);
  expect(report.finalState.rejectedRequests).toBe(1);
});
```

- [ ] **Step 2: Run the test and verify the expected missing-module failure**

Run: `npm run test -- src/domain/bookingEngine.test.ts`

Expected: FAIL because `runScenario` does not exist yet.

- [ ] **Step 3: Implement the minimal scenario types, definitions, and runner**

```ts
export function runScenario(id: ScenarioId): ScenarioReport {
  const definition = scenarios.find((scenario) => scenario.id === id);
  if (!definition) throw new Error(`Unknown scenario: ${id}`);
  return simulate(definition);
}
```

- [ ] **Step 4: Run the race test and verify it passes**

Run: `npm run test -- src/domain/bookingEngine.test.ts`

Expected: PASS for the race-condition test.

- [ ] **Step 5: Repeat red-green tests for stale hold, duplicate callback, time-zone mismatch, ordering, and unknown identifiers**

```ts
expect(runScenario('expired-hold').finalState.cancelledHolds).toBe(1);
expect(runScenario('duplicate-callback').finalState.ignoredCallbacks).toBe(1);
expect(runScenario('timezone').finalState.rejectedRequests).toBe(1);
expect(runScenario('race').events.map((event) => event.order)).toEqual([1, 2, 3, 4]);
expect(() => runScenario('bad-id' as ScenarioId)).toThrow('Unknown scenario: bad-id');
```

- [ ] **Step 6: Run all domain tests and commit**

Run: `npm run test -- src/domain/bookingEngine.test.ts`

Expected: PASS with all six behavior tests.

```bash
git add src/domain
git commit -m "feat: add deterministic booking safety simulator"
```

### Task 3: Build accessible dashboard components

**Files:**
- Create: `src/components/ScenarioCard.tsx`
- Create: `src/components/RunTimeline.tsx`
- Create: `src/components/ReliabilityReport.tsx`
- Create: `src/components/ScenarioCard.test.tsx`
- Create: `src/App.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `ScenarioDefinition`, `ScenarioReport`, and `runScenario()`.
- Produces: a screen where scenario buttons change the selected scenario and Run simulation reveals its report.

- [ ] **Step 1: Write a failing component test for scenario selection**

```tsx
it('selects the expired hold scenario when its card is activated', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /expired payment hold/i }));
  expect(screen.getByRole('heading', { name: /expired payment hold/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the test and verify the expected missing-App failure**

Run: `npm run test -- src/components/ScenarioCard.test.tsx`

Expected: FAIL because the dashboard component does not exist yet.

- [ ] **Step 3: Implement the minimum selectable card and dashboard state**

```tsx
const [selectedId, setSelectedId] = useState<ScenarioId>('race');
const [report, setReport] = useState<ScenarioReport | null>(null);
```

- [ ] **Step 4: Run the selection test and verify it passes**

Run: `npm run test -- src/components/ScenarioCard.test.tsx`

Expected: PASS.

- [ ] **Step 5: Add a failing test for running the selected scenario, then implement the report reveal**

```tsx
await user.click(screen.getByRole('button', { name: /run simulation/i }));
expect(await screen.findByText(/reliability report/i)).toBeVisible();
```

- [ ] **Step 6: Run the complete test suite and commit**

Run: `npm run test`

Expected: PASS with domain and component tests.

```bash
git add src/App.tsx src/main.tsx src/components
git commit -m "feat: add SlotShield simulation dashboard"
```

### Task 4: Create the responsive visual system and project documentation

**Files:**
- Create: `src/styles.css`
- Create: `README.md`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: semantic class names from the dashboard components.
- Produces: a dark, responsive reliability-console interface and a README that explains local setup, fake-data boundaries, test commands, and project structure.

- [ ] **Step 1: Add responsive layout styles for the hero, scenario grid, timeline, and report**

```css
@media (max-width: 760px) {
  .dashboard-grid,
  .scenario-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Write README sections for purpose, scenarios, local setup, tests, safety, and screenshots**

```md
## Safety

SlotShield only runs deterministic, fictional booking simulations. It has no payment, customer, calendar, or production-service connection.
```

- [ ] **Step 3: Run tests, build production assets, and commit**

Run: `npm run test && npm run build`

Expected: both commands exit 0.

```bash
git add src/styles.css src/main.tsx README.md
git commit -m "docs: polish SlotShield interface and setup guide"
```

### Task 5: Verify the full user flow

**Files:**
- Verify: `src/domain/bookingEngine.test.ts`
- Verify: `src/components/ScenarioCard.test.tsx`
- Verify: `README.md`

**Interfaces:**
- Verifies: all four scenario cards select, run, and expose a simulation report in the browser.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm run test`

Expected: PASS with zero failures.

- [ ] **Step 2: Build production assets**

Run: `npm run build`

Expected: Vite emits `dist/` and exits 0.

- [ ] **Step 3: Start the local website and perform a browser smoke test**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite prints a local URL. Select and run each scenario, then confirm the report title and final state update.

- [ ] **Step 4: Review the Git diff and commit remaining verified changes**

Run: `git status --short && git diff --check`

Expected: no whitespace errors and no uncommitted intended source changes.

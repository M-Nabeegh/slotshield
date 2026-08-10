# SlotShield Website Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public **Test your website** flow that checks a client's public appointment site and safely hands off to staging-only reliability tests without pretending a URL proves backend safety.

**Architecture:** Keep the public website check in a small server route that validates targets, follows only bounded same-origin redirects/links, and returns a typed JSON report. Keep the UI in a focused client component with explicit public-check and staging-audit states. Add a separate transient staging contract route that can call only a client's declared test adapter; existing deterministic local scenarios remain the fallback when no adapter is configured.

**Tech Stack:** React 19, TypeScript 5.9, Vinext/Next App Router route handlers, Cloudflare Worker `fetch`, Vitest, Testing Library, Node server-render tests, Playwright.

## Global Constraints

- Accept only public `https://` targets for the website check; never accept URL credentials, local-only hostnames, private/reserved IP literals, or non-default ports.
- Revalidate every redirect and discovered link; allow at most three same-origin booking-related pages after the homepage.
- Enforce a five-second request budget, a 128 KiB response snippet limit, and no whole-site crawl.
- Never issue booking, payment, cancellation, webhook, or other mutation requests to a submitted public URL.
- The staging adapter is opt-in, transient, and test-only; tokens and request bodies are never persisted.
- The public preview remains account-free and does not require ChatGPT sign-in.
- Use sentence-case copy and the existing porcelain/graphite/violet/mint visual system; do not add generic telemetry chrome.
- Keep dependencies unchanged unless the existing runtime cannot support a required primitive.
- Every task ends with focused tests, `git diff --check`, a meaningful commit, and a push to both `feat/slotshield-v1` and `main`.

---

## File map

- Create `app/lib/websiteAudit.ts`: URL policy, bounded response helpers, HTML signal extraction, and typed public-check results.
- Create `app/lib/websiteAudit.test.ts`: pure validation and HTML extraction tests.
- Create `app/lib/stagingContract.ts`: transient staging adapter types and safe request/response normalization.
- Create `app/lib/stagingContract.test.ts`: contract normalization tests.
- Create `app/api/website-check/route.ts`: `POST` handler for the public URL check.
- Create `app/api/website-check/route.test.ts`: mocked-fetch route tests.
- Create `app/api/staging-audit/route.ts`: `POST` handler for the opt-in staging adapter.
- Create `app/api/staging-audit/route.test.ts`: mocked-fetch safety and contract tests.
- Create `app/components/WebsiteAuditPanel.tsx`: public-check form, report, staging handoff, and fake-scenario fallback.
- Modify `app/page.tsx`: mount the new panel between the hero and scenario picker; provide the existing fake-scenario action as a fallback callback.
- Modify `app/globals.css`: style the audit card, states, findings, staging form, and responsive layout within the existing visual system.
- Modify `app/page.test.tsx`: test the public entry point and browser states with mocked `fetch`.
- Modify `tests/rendered-html.test.mjs`: assert the public audit entry point server-renders.
- Modify `README.md`: document the client flow, staging adapter contract, and safety boundary.
- Create `docs/superpowers/specs/2026-08-10-slotshield-test-adapter.md`: document the minimal staging adapter contract for future client integrations.

---

### Task 1: Define the public website-audit domain helpers

**Files:**
- Create: `app/lib/websiteAudit.ts`
- Test: `app/lib/websiteAudit.test.ts`

**Interfaces:**
- Produces `WebsiteCheckRequest`, `WebsiteCheckResult`, `WebsiteFinding`, `validatePublicUrl()`, `extractPageSignals()`, and `isSafePublicUrl()` for the route and UI.

- [ ] **Step 1: Write failing pure-function tests**

```ts
import { describe, expect, it } from "vitest";
import { extractPageSignals, validatePublicUrl } from "./websiteAudit";

describe("validatePublicUrl", () => {
  it("accepts an https public URL", () => {
    expect(validatePublicUrl("https://clinic.example.com")).toEqual({
      ok: true,
      url: "https://clinic.example.com/",
    });
  });

  it.each([
    "http://clinic.example.com",
    "https://localhost:8787",
    "https://127.0.0.1/",
    "https://10.0.0.5/",
    "https://clinic.example.com:8443/",
    "https://user:secret@clinic.example.com/",
    "javascript:alert(1)",
  ])("rejects unsafe target %s", (value) => {
    expect(validatePublicUrl(value).ok).toBe(false);
  });
});

describe("extractPageSignals", () => {
  it("finds the title and bounded booking links", () => {
    const result = extractPageSignals(`
      <title>Altaf Clinic</title>
      <a href="/appointments">Book an appointment</a>
      <a href="/about">About</a>
      <a href="https://other.example/book">Other</a>
    `, "https://clinic.example.com/");

    expect(result.title).toBe("Altaf Clinic");
    expect(result.bookingLinks).toEqual([
      { label: "Book an appointment", url: "https://clinic.example.com/appointments" },
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- app/lib/websiteAudit.test.ts`

Expected: FAIL because the helper module and exported functions do not exist.

- [ ] **Step 3: Implement the safety policy and signal extraction**

Implement the exact exported types and functions. `validatePublicUrl()` must:

```ts
export function validatePublicUrl(value: string):
  | { ok: true; url: string }
  | { ok: false; code: WebsiteCheckErrorCode; message: string };
```

Parse with `new URL`, require `https:`, reject credentials, explicit ports other
than `443`, localhost/local/internal/test/example/onion hostnames, IPv4 private
and reserved ranges, and bracketed IPv6 literals. Normalize the trailing path
but preserve the host. `extractPageSignals()` must use bounded regex parsing,
return the first safe title, and return no more than three same-origin links
whose label or path contains `book`, `appointment`, `schedule`, `reserve`, or
`contact`.

- [ ] **Step 4: Run focused tests and type/lint checks**

Run: `npm test -- app/lib/websiteAudit.test.ts`

Expected: all URL-policy and HTML-signal tests pass.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 5: Commit and push**

```bash
git add app/lib/websiteAudit.ts app/lib/websiteAudit.test.ts
git commit -m "test: define safe public website audit helpers"
git push origin feat/slotshield-v1
git push origin feat/slotshield-v1:main
```

---

### Task 2: Implement the public website-check route

**Files:**
- Create: `app/api/website-check/route.ts`
- Test: `app/api/website-check/route.test.ts`

**Interfaces:**
- Consumes `validatePublicUrl()` and `extractPageSignals()` from Task 1.
- Produces `POST /api/website-check` with `{ url: string }` input and a `WebsiteCheckResult` JSON response.

- [ ] **Step 1: Write failing mocked-fetch route tests**

Cover these cases without network access:

```ts
it("returns a verified public result with booking signals", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    new Response(
      '<title>Clinic</title><a href="/appointments">Book appointment</a>',
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
    ),
  ));

  const response = await POST(jsonRequest({ url: "https://clinic.example.com" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    status: "verified",
    httpStatus: 200,
    https: true,
    bookingLinks: [{ url: "https://clinic.example.com/appointments" }],
  });
});

it("rejects a local target before fetch", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  const response = await POST(jsonRequest({ url: "https://127.0.0.1/" }));
  expect(response.status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("returns an actionable result for a timeout or non-html response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    new Response("PDF", { status: 200, headers: { "content-type": "application/pdf" } }),
  ));

  const response = await POST(jsonRequest({ url: "https://clinic.example.com" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ status: "attention" });
});
```

- [ ] **Step 2: Run the route tests and verify they fail**

Run: `npm test -- app/api/website-check/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the bounded fetch pipeline**

`POST` must reject malformed JSON and missing `url` with status 400. For a valid
target, use an `AbortController` with a five-second timeout, `redirect: "manual"`,
and `Accept: text/html`. On a 3xx response, read `Location`, validate it, and
follow at most two redirects. Reject a response whose `Content-Length` exceeds
128 KiB; otherwise read at most 128 KiB from the body. Only parse HTML content.

Return a stable result shape:

```ts
type WebsiteCheckResult = {
  status: "verified" | "attention" | "blocked";
  requestedUrl: string;
  finalUrl: string | null;
  httpStatus: number | null;
  responseTimeMs: number | null;
  https: boolean;
  pageTitle: string | null;
  contentType: string | null;
  bookingLinks: Array<{ label: string; url: string }>;
  findings: WebsiteFinding[];
  message: string;
};
```

If the homepage contains safe booking links, make at most three additional
same-origin GETs and merge unique discovered paths into the report. Never send
anything except GET. Convert network failures into an actionable `blocked` or
`attention` result instead of throwing an unhandled error.

- [ ] **Step 4: Run route tests, full tests, and build**

Run: `npm test -- app/api/website-check/route.test.ts app/lib/websiteAudit.test.ts`

Expected: all focused route/helper tests pass.

Run: `npm run test`

Expected: existing tests plus new route tests pass.

Run: `npm run build`

Expected: Vinext build completes with the API route included.

- [ ] **Step 5: Commit and push**

```bash
git add app/api/website-check/route.ts app/api/website-check/route.test.ts
git commit -m "feat: add safe public website check route"
git push origin feat/slotshield-v1
git push origin feat/slotshield-v1:main
```

---

### Task 3: Define and validate the staging adapter contract

**Files:**
- Create: `app/lib/stagingContract.ts`
- Test: `app/lib/stagingContract.test.ts`
- Create: `docs/superpowers/specs/2026-08-10-slotshield-test-adapter.md`

**Interfaces:**
- Produces `StagingAuditRequest`, `StagingAuditResult`, and `normalizeStagingResult()` for the staging route and UI.
- Defines a client-owned adapter endpoint at `{baseUrl}/.well-known/slotshield-test.json` and `{baseUrl}/.well-known/slotshield-test/run`.

- [ ] **Step 1: Write failing contract-normalization tests**

Test that valid adapter output preserves scenario IDs and findings, missing
scenario results become `not-tested`, and arbitrary response fields are not
returned to the browser.

```ts
it("normalizes only the supported staging result fields", () => {
  expect(normalizeStagingResult({
    status: "verified",
    scenarios: [{ id: "race", status: "passed", evidence: "conflict returned" }],
    secret: "must not escape",
  })).toEqual({
    status: "verified",
    scenarios: [{ id: "race", status: "passed", evidence: "conflict returned" }],
  });
});
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `npm test -- app/lib/stagingContract.test.ts`

Expected: FAIL because the contract module does not exist.

- [ ] **Step 3: Implement typed normalization and write the adapter spec**

Accept only `race`, `expired-hold`, `duplicate-callback`, and `timezone` IDs;
only `passed`, `attention`, or `not-tested` statuses; and truncate evidence to
240 characters. The adapter manifest must declare `contractVersion: 1`,
`supports: string[]`, and `testOnly: true`. The documentation must show a
minimal JSON request/response and explicitly say that the base URL must be a
staging host with a temporary token.

- [ ] **Step 4: Run tests and lint**

Run: `npm test -- app/lib/stagingContract.test.ts && npm run lint`

Expected: all contract tests pass and lint exits 0.

- [ ] **Step 5: Commit and push**

```bash
git add app/lib/stagingContract.ts app/lib/stagingContract.test.ts docs/superpowers/specs/2026-08-10-slotshield-test-adapter.md
git commit -m "docs: define SlotShield staging test adapter"
git push origin feat/slotshield-v1
git push origin feat/slotshield-v1:main
```

---

### Task 4: Implement the opt-in staging-audit route

**Files:**
- Create: `app/api/staging-audit/route.ts`
- Test: `app/api/staging-audit/route.test.ts`

**Interfaces:**
- Consumes `validatePublicUrl()` and `normalizeStagingResult()` from Tasks 1 and 3.
- Produces `POST /api/staging-audit` with `{ baseUrl: string; token: string; scenarios: ScenarioId[] }` input and a sanitized `StagingAuditResult` response.

- [ ] **Step 1: Write failing mocked-fetch tests**

Cover: local target rejection before fetch, manifest rejection when `testOnly`
is false, token sent only in the authorization header, supported scenarios
forwarded to the test endpoint, timeout normalization, and secret/evidence
truncation in the response.

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `npm test -- app/api/staging-audit/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement transient staging calls**

Validate the base URL with the same public-target policy, require a non-empty
token of at most 256 characters, and allow only the four known scenario IDs.
Fetch the manifest with `GET`, require `contractVersion: 1` and `testOnly: true`,
then call the run endpoint with `POST`, the scenario IDs, and a synthetic mode
flag. Use the same five-second budget and redirect validation. Never log or
return the token. If the adapter is absent or unsupported, return `attention`
with a setup instruction and leave the existing fake simulation available.

- [ ] **Step 4: Run all tests and build**

Run: `npm test && npm run lint && npm run test:site`

Expected: all tests, lint, production build, and server-render checks pass.

- [ ] **Step 5: Commit and push**

```bash
git add app/api/staging-audit/route.ts app/api/staging-audit/route.test.ts
git commit -m "feat: add staging-only reliability audit route"
git push origin feat/slotshield-v1
git push origin feat/slotshield-v1:main
```

---

### Task 5: Build the public Test your website experience

**Files:**
- Create: `app/components/WebsiteAuditPanel.tsx`
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`

**Interfaces:**
- Consumes `/api/website-check` and `/api/staging-audit` JSON shapes.
- Receives `onTryScenario: () => void` from `Home` so the existing deterministic simulator remains the fallback.

- [ ] **Step 1: Write failing component tests**

Cover these user-visible behaviors:

```ts
it("shows the public check entry point", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: /test your website/i })).toBeVisible();
  expect(screen.getByRole("textbox", { name: /website url/i })).toBeVisible();
});

it("shows a verified public result and staging handoff", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    new Response(JSON.stringify({
      status: "verified",
      requestedUrl: "https://clinic.example.com/",
      finalUrl: "https://clinic.example.com/",
      httpStatus: 200,
      responseTimeMs: 220,
      https: true,
      pageTitle: "Clinic",
      contentType: "text/html",
      bookingLinks: [{ label: "Book appointment", url: "https://clinic.example.com/appointments" }],
      findings: [],
      message: "Public surface verified.",
    }), { status: 200, headers: { "content-type": "application/json" } }),
  ));

  const user = userEvent.setup();
  render(<Home />);
  await user.type(screen.getByRole("textbox", { name: /website url/i }), "https://clinic.example.com");
  await user.click(screen.getByRole("button", { name: /check site/i }));

  expect(await screen.findByText(/public surface verified/i)).toBeVisible();
  expect(screen.getByRole("button", { name: /audit a staging flow/i })).toBeVisible();
});
```

Also cover malformed URL/actionable error, staging form visibility, and the
existing **Try a fake scenario** callback.

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `npm test -- app/page.test.tsx`

Expected: FAIL because the audit panel and entry point do not exist.

- [ ] **Step 3: Implement the panel and page composition**

Add a `WebsiteAuditPanel` after the hero and before scenario selection. The idle
state includes a labeled URL input, a **Check site** button, and the three safety
lines: `No login`, `No booking actions`, and `No patient data`. On success,
render a compact result grid for status, response time, HTTPS, title, and found
booking pages. Include explicit buttons for **Audit a staging flow** and **Try a
fake scenario**. The staging form collects base URL, temporary token, and
scenario checkboxes, but labels it “test environment only.” Use `aria-live` for
loading/results and keep focus on the result heading after completion.

- [ ] **Step 4: Run component tests and lint**

Run: `npm test -- app/page.test.tsx && npm run lint`

Expected: all page/audit interactions pass and lint exits 0.

- [ ] **Step 5: Commit and push**

```bash
git add app/components/WebsiteAuditPanel.tsx app/page.tsx app/page.test.tsx
git commit -m "feat: add public website audit entry flow"
git push origin feat/slotshield-v1
git push origin feat/slotshield-v1:main
```

---

### Task 6: Polish responsive styles, server-render contract, and docs

**Files:**
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Keeps the existing page structure and public URL unchanged while adding the new audit surface.

- [ ] **Step 1: Extend the server-rendered HTML test**

Assert the rendered document contains `Test your website`, `Website URL`,
`Check site`, and the safety copy. Keep the existing assertions for the public
preview, scenario picker, and first-run simulator action.

- [ ] **Step 2: Run the server-render test and verify the new assertions fail**

Run: `npm run test:site`

Expected: the new assertions fail until the UI and styles are complete.

- [ ] **Step 3: Add responsive audit-card styles**

Use the existing tokens and spacing. Keep the form single-row on desktop,
stacked on narrow screens, and make result findings readable at 390px. Add
visible keyboard focus, reduced-motion behavior, and no horizontal overflow.
Avoid uppercase labels for user-facing actions; reserve the utility face for
status values and URLs.

- [ ] **Step 4: Update the README**

Document the client journey, public check limits, staging adapter endpoints,
synthetic-only behavior, and the exact commands for local verification. State
clearly that the URL check does not prove backend reliability.

- [ ] **Step 5: Run the full verification suite**

Run:

```bash
npm test
npm run lint
npm run test:site
npm audit --omit=dev --json
git diff --check
```

Expected: all tests pass, lint/build/render checks pass, the production audit
reports zero vulnerabilities, and the diff is clean.

- [ ] **Step 6: Commit and push**

```bash
git add app/globals.css tests/rendered-html.test.mjs README.md
git commit -m "docs: explain SlotShield client website audit"
git push origin feat/slotshield-v1
git push origin feat/slotshield-v1:main
```

---

### Task 7: Verify the public deployment and handoff

**Files:**
- No source changes expected; use the existing `.openai/hosting.json` project.

- [ ] **Step 1: Package the exact validated commit**

Run the Sites packaging helper against the successful build and retain the
archive path privately. Save a new Sites version with the exact pushed commit
SHA; never deploy an uncommitted or different archive.

- [ ] **Step 2: Deploy the existing public Sites project**

Reuse the existing project ID and public access policy. Poll deployment status
until Sites reports `succeeded`; do not report success from a pending response.

- [ ] **Step 3: Verify the live flow**

Use a fresh browser session at the public URL to confirm the audit card renders,
submit a harmless public test URL, confirm the result state, and verify that the
fake-scenario fallback still runs. Repeat at a 390px viewport and assert no
horizontal overflow or browser error overlay.

- [ ] **Step 4: Commit any only-if-needed verification doc change**

Do not create empty commits. If the live verification changes user-facing
documentation, make one focused docs commit; otherwise leave the validated
source unchanged.

- [ ] **Step 5: Report the handoff**

Return the public URL, GitHub URL/latest commit, what the public check verifies,
what requires staging access, and the exact test/build status. Do not expose
temporary source credentials or client tokens.

# SlotShield

SlotShield is a public SaaS-style booking-reliability simulator. Check a client's public appointment website, choose a high-risk booking edge case, replay a deterministic event trace, and inspect the guardrail that protects the final booking state.

![SlotShield social preview](public/slotshield-og.png)

## Public preview

Open the live sandbox at [slotshield-lab.jatnabeegh.chatgpt.site](https://slotshield-lab.jatnabeegh.chatgpt.site). It is designed for a normal visitor or client to test immediately:

1. Paste an appointment website into `Test your website` for a bounded public-surface check.
2. Choose a failure mode or click `Try this scenario` for the deterministic sandbox.
3. Read the fictional event trace as the guardrail handles the request.
4. Inspect the reliability score, final state, and recommendation.

No account, data upload, payment field, or setup is required.

## Test a client website

The public website check verifies only what a normal visitor can reach:

- HTTPS and reachability
- HTTP status and response time
- HTML page title and content type
- Booking-related links such as `Book`, `Appointments`, or `Schedule`

It uses a short timeout, a small response limit, and a shallow same-origin
discovery pass. It never submits a booking, payment, cancellation, webhook, or
other mutation request. A URL check is not proof that a private booking backend
is reliable.

For deeper tests, a client can open `Audit a staging flow` and provide a
temporary token for a test-only adapter. The adapter manifest and run response
are documented in [`docs/superpowers/specs/2026-08-10-slotshield-test-adapter.md`](docs/superpowers/specs/2026-08-10-slotshield-test-adapter.md).
Production URLs are deliberately rejected.

## What it demonstrates

- A database-level unique slot constraint stopping a double-booking race.
- Stale payment holds clearing before an availability check.
- Idempotency keys absorbing duplicate payment callbacks.
- Explicit time-zone normalization rejecting an invalid appointment time.

## Scenarios

| Scenario | Failure | Guardrail |
| --- | --- | --- |
| Double-booking race | Two requests claim the same slot within milliseconds. | Unique active-slot constraint. |
| Expired payment hold | A pending payment keeps a slot unavailable after its window ends. | Stale-hold cleanup before availability checks. |
| Duplicate payment callback | A provider retries a completed payment event. | Persisted provider-event idempotency key. |
| Time-zone mismatch | A local time does not map to the clinic schedule. | IANA time-zone normalization before validation. |

## Run it locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local address printed by the development server.

## Product boundaries

SlotShield is a rehearsal workspace, not a booking service. It deliberately has
no sign-in flow, customer database, payment provider, calendar, analytics
tracker, or production booking action. Its two API routes only perform the
bounded public website check and the opt-in staging adapter call. Client URLs,
tokens, request bodies, and reports are not stored.

## Verify it

```bash
npm run test
npm run lint
npm run test:site
```

The test suite covers each deterministic scenario, scenario selection, public access, clipboard fallback, the website-check safety policy, the staging adapter contract, and the reliability-report interaction. The site test builds the worker and checks its server-rendered SaaS copy.

## Project structure

```text
app/domain/               deterministic scenario data and booking engine
app/components/           public access, audit, slot rail, picker, trace, and report UI
app/lib/                  URL safety, page signals, and staging-contract normalization
app/api/                  bounded public-check and staging-audit route handlers
app/page.tsx              interactive SaaS workspace composition
app/page.test.tsx         browser-style interaction coverage
tests/                    server-rendered site verification
public/                   social preview asset
```

## Stack

React 19, TypeScript, Vinext, Vitest, Testing Library, and CSS.

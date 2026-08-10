# SlotShield

SlotShield is a visual booking-reliability simulator. Choose a high-risk booking edge case, replay a deterministic event trace, and inspect the guardrail that protects the final booking state.

![SlotShield social preview](public/slotshield-og.png)

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

## Verify it

```bash
npm run test
npm run lint
npm run test:site
```

The test suite covers each deterministic scenario, scenario selection, and the reliability-report interaction. The site test builds the worker and checks its server-rendered HTML.

## Scope of v1

SlotShield uses synthetic scenario data only. It does not create appointments, store patient records, call payment providers, process webhooks, or connect to calendars. That boundary makes the project safe to share as a public GitHub demo.

## Project structure

```text
app/domain/        deterministic scenario data and booking engine
app/page.tsx       interactive simulator dashboard
app/page.test.tsx  browser-style interaction coverage
tests/             server-rendered site verification
public/            social preview asset
```

## Stack

React 19, TypeScript, Vinext, Vitest, Testing Library, and CSS.

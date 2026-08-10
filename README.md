# SlotShield

SlotShield is a public SaaS-style booking-reliability simulator. Choose a high-risk booking edge case, replay a deterministic event trace, and inspect the guardrail that protects the final booking state.

![SlotShield social preview](public/slotshield-og.png)

## Public preview

Open the live sandbox at [slotshield-lab.jatnabeegh.chatgpt.site](https://slotshield-lab.jatnabeegh.chatgpt.site). It is designed for a normal visitor or client to test immediately:

1. Choose a failure mode or click `Try this scenario`.
2. Read the fictional event trace as the guardrail handles the request.
3. Inspect the reliability score, final state, and recommendation.

No account, data upload, payment field, or setup is required.

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

SlotShield is a rehearsal workspace, not a booking service. It deliberately has no sign-in flow, customer database, payment provider, calendar, webhook endpoint, analytics tracker, or production booking action. The public preview uses the same deterministic data as the local build.

## Verify it

```bash
npm run test
npm run lint
npm run test:site
```

The test suite covers each deterministic scenario, scenario selection, public access, clipboard fallback, and the reliability-report interaction. The site test builds the worker and checks its server-rendered SaaS copy.

## Project structure

```text
app/domain/               deterministic scenario data and booking engine
app/components/           public access, slot rail, picker, trace, and report UI
app/page.tsx              interactive SaaS workspace composition
app/page.test.tsx         browser-style interaction coverage
tests/                    server-rendered site verification
public/                   social preview asset
```

## Stack

React 19, TypeScript, Vinext, Vitest, Testing Library, and CSS.

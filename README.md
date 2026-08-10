# SlotShield

> Appointment reliability, before production.

[Open the public preview](https://slotshield-lab.jatnabeegh.chatgpt.site) · [Read the staging adapter contract](docs/superpowers/specs/2026-08-10-slotshield-test-adapter.md)

![SlotShield social preview](public/slotshield-og.png)

SlotShield is an account-free Reliability Studio for appointment systems. It
starts with the surface a visitor can reach, separates observed facts from
behavior that needs a test environment, and lets a team rehearse deterministic
booking failures without touching real customers, payments, or calendars.

## The product path

The public preview is designed to be useful on the first visit — no ChatGPT
sign-in, account creation, data upload, or payment field is required.

1. **Add your public link** — paste an appointment URL into the bounded,
   read-only public check.
2. **Review what was observed** — inspect HTTPS, reachability, response timing,
   content type, booking-related links, and the check's explicit limits.
3. **Test staging safely** — connect a test-only adapter for deeper checks, or
   choose a fictional scenario for a local deterministic rehearsal.

## What the public check can prove

SlotShield verifies only what a normal visitor can reach. The check reports:

- HTTPS and the final reachable URL
- HTTP status and response time
- HTML title and content type
- Same-origin booking-related links such as `Book`, `Appointments`, or
  `Schedule`
- Plain-language findings for reachability, HTTPS, response time, content, and
  booking surface

The checker uses a short timeout, a bounded response size, a small redirect
limit, and a shallow same-origin discovery pass. It never submits a booking,
payment, cancellation, webhook, or other mutation request.

> A verified public page is not proof that private booking behavior is reliable.
> Concurrency, authentication, payment handling, and backend invariants belong
> in a test environment.

## Test-only staging adapter

The **Audit a staging flow** path accepts a client-owned HTTPS test URL and a
temporary token. The adapter must expose:

```text
GET  /.well-known/slotshield-test.json
POST /.well-known/slotshield-test/run
```

The manifest must declare `contractVersion: 1`, supported scenario IDs, and
`testOnly: true`. Every run uses synthetic identifiers and an isolated test
namespace. SlotShield clears the token after a successful run, does not render
it in evidence, and does not fall back to production when the contract is
missing or invalid.

See the complete request/response shape in [`docs/superpowers/specs/2026-08-10-slotshield-test-adapter.md`](docs/superpowers/specs/2026-08-10-slotshield-test-adapter.md).

## Fictional reliability rehearsals

The simulator uses deterministic local data rather than pretending to be a
live booking integration.

| Scenario | Failure being rehearsed | Guardrail shown |
| --- | --- | --- |
| Double-booking race | Two requests claim one slot within milliseconds. | Unique active-slot constraint. |
| Expired payment hold | A pending payment keeps a slot unavailable after its window ends. | Stale-hold cleanup before availability checks. |
| Duplicate payment callback | A provider retries a completed payment event. | Persisted provider-event idempotency key. |
| Time-zone mismatch | A local time does not map to the clinic schedule. | IANA time-zone normalization before validation. |

Each rehearsal ends with an event trace, a final booking state, and a concrete
recommendation. The data is intentionally fictional and repeatable.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server. The app is a client-side
React workspace with two bounded API routes:

```text
app/api/website-check   public URL inspection
app/api/staging-audit   opt-in test-only adapter call
```

There is no sign-in flow, customer database, payment provider, calendar,
analytics tracker, or production booking action. No persistence layer is
configured; the handlers do not store client URLs, tokens, request bodies, or
reports.

## Verify it

```bash
npm run test       # unit and interaction coverage
npm run lint       # ESLint
npm run test:site  # production build + server-rendered HTML check
```

The suite covers the deterministic booking engine, all four scenarios, public
URL safety, evidence/limit copy, blocked and network-error states, staging
token privacy, clipboard fallback, keyboard focus preservation, responsive
semantic controls, the reliability report, and server-rendered product copy.

## Project map

```text
app/components/       Reliability Studio UI, audit states, trace, and report
app/domain/            Deterministic scenario definitions and booking engine
app/lib/               URL safety, page signals, preview URL, adapter contract
app/api/                Bounded public-check and staging-audit route handlers
app/page.tsx           Interactive workspace composition
app/page.test.tsx      Testing Library interaction and accessibility coverage
tests/                 Server-rendered site verification
docs/superpowers/      Product specs, implementation plans, and adapter contract
public/                Social preview and favicon assets
```

## Design notes

The interface intentionally favors a calm paper/graphite system, line-based
hierarchy, sentence-case copy, and evidence boundaries over marketing gradients
or fake operational metrics. The first viewport makes the safe action obvious;
the console previews the three depths of inspection; the lower workbench makes
the trace — risk → event → protection → final state — the visual center.

## Portfolio note

Designed and engineered by Muhammad Nabeegh.

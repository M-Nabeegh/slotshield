<div align="center">

<img src="public/slotshield-og.png" alt="SlotShield reliability studio preview" width="760" />

# SlotShield

### Appointment reliability, before production.

An account-free Reliability Studio for finding fragile booking flows, explaining what a public check can actually prove, and rehearsing failure modes safely.

<a href="https://slotshield-lab.jatnabeegh.chatgpt.site">Open the live preview</a> · <a href="docs/superpowers/specs/2026-08-10-slotshield-test-adapter.md">Read the adapter contract</a>

</div>

<br />

## Why this exists

Appointment software can look healthy while quietly losing slots, accepting a
duplicate callback, or showing the wrong time zone. SlotShield turns those
risks into a small, inspectable workflow:

| 01 · Inspect | 02 · Separate | 03 · Rehearse |
| --- | --- | --- |
| Check the public appointment surface from a normal browser request. | Make the boundary between observed evidence and unverified backend behavior explicit. | Run deterministic, synthetic failure scenarios before connecting a real system. |

The result is intentionally more useful than a green check: every run ends in
evidence, a limitation, and a next action.

## The product flow

1. **Paste a public appointment link.** No ChatGPT sign-in, account creation,
   upload, payment field, or customer data is required.
2. **Review the public check.** SlotShield records HTTPS, the final URL, HTTP
   status, response timing, page title, content type, and same-origin booking
   links such as `Book`, `Appointments`, or `Schedule`.
3. **Choose a deeper rehearsal.** Pick a fictional scenario locally or point a
   test-only staging adapter at an isolated environment.
4. **Read the report.** The report separates what was observed from what still
   needs a staging or production review.

## Evidence boundary

The public check is deliberately bounded. It can show that a page is reachable
and expose useful booking-surface signals; it cannot prove private scheduling
logic, concurrency behavior, authentication, payment handling, webhooks, or
database invariants.

Every request uses a short timeout, a bounded response size, a small redirect
limit, and a shallow same-origin discovery pass. SlotShield never submits a
booking, payment, cancellation, webhook, or other mutation request.

> A reachable booking page is a starting point for reliability work, not a
> production certification.

## Test-only staging adapter

The **Audit a staging flow** path accepts a client-owned HTTPS test URL and a
temporary token. The adapter contract is intentionally narrow:

```text
GET  /.well-known/slotshield-test.json
POST /.well-known/slotshield-test/run
```

The manifest must declare `contractVersion: 1`, supported scenario IDs, and
`testOnly: true`. Runs use synthetic identifiers and an isolated test
namespace. SlotShield clears a token after a successful run, excludes it from
the evidence report, and refuses to fall back to production when the contract
is missing or invalid.

See the complete request and response shape in the
[staging adapter contract](docs/superpowers/specs/2026-08-10-slotshield-test-adapter.md).

## Fictional reliability rehearsals

The simulator is deterministic and local. It does not pretend to be connected
to a clinic, calendar, payment provider, or customer database.

| Scenario | Failure being rehearsed | Guardrail shown |
| --- | --- | --- |
| Double-booking race | Two requests claim one slot within milliseconds. | Unique active-slot constraint. |
| Expired payment hold | A pending payment keeps a slot unavailable after its window ends. | Stale-hold cleanup before availability checks. |
| Duplicate payment callback | A provider retries a completed payment event. | Persisted provider-event idempotency key. |
| Time-zone mismatch | A local time does not map to the clinic schedule. | IANA time-zone normalization before validation. |

Each rehearsal ends with an event trace, a final booking state, and a concrete
recommendation. The data is fictional, repeatable, and safe to inspect.

## Run it locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The app is a client-side React workspace with two bounded API routes:

```text
app/api/website-check   public URL inspection
app/api/staging-audit   opt-in test-only adapter call
```

No sign-in flow, customer database, payment provider, calendar, analytics
tracker, or production booking action is configured. The handlers do not store
client URLs, tokens, request bodies, or reports.

## Verify it

```bash
npm run test       # unit and interaction coverage
npm run lint       # ESLint
npm run test:site  # production build + server-rendered HTML check
```

The suite covers the deterministic booking engine, all four scenarios, public
URL safety, evidence and limit copy, blocked and network-error states, staging
token privacy, keyboard focus preservation, responsive controls, the
reliability report, and server-rendered product copy.

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

## Design direction

SlotShield uses a calm paper, graphite, and mint system rather than a generic
dashboard template. The hierarchy is built from readable evidence, restrained
status labels, and a trace that makes the chain visible:

`risk → event → protection → final state`

The visual system is responsive from a narrow phone viewport to a wide desktop
workbench, with no account wall between a curious employer and the product.

<div align="center">

**Designed and engineered by Muhammad Nabeegh.**

</div>

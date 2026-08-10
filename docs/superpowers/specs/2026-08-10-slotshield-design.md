# SlotShield v1 Design

## Purpose

SlotShield is a public, browser-based reliability simulator for appointment and booking systems. It teaches developers how a booking flow handles concurrency, expiring payment holds, duplicate payment callbacks, and client time-zone mistakes before those failures reach a real customer.

The product uses deterministic fake data only. It never connects to a payment provider, calendar, booking API, or user account.

## User experience

Visitors land on a single responsive dashboard with a short explanation, four scenario cards, a selected scenario briefing, an event timeline, and a reliability report.

Selecting a scenario updates the briefing. Running it plays a short, ordered timeline and produces a transparent report. Each report states the simulated failure, the protection that caught it, the resulting booking state, and a practical implementation recommendation.

The four fixed scenarios are:

1. **Double booking race**: two requests claim the same appointment slot. A uniqueness guard confirms one booking and rejects the other.
2. **Expired payment hold**: a stale `payment_pending` hold expires before a new booking attempt. Cleanup cancels the stale hold and admits the new request.
3. **Duplicate payment callback**: a provider retries the same successful callback. An idempotency key keeps the booking confirmed once.
4. **Time-zone mismatch**: a client submits a timestamp that does not match the clinic's local slot. Validation rejects it before a booking record is created.

## Technical design

The website uses the bundled Vinext, React, and TypeScript starter so it can run locally and produce Cloudflare Worker-compatible output. The simulator lives in pure TypeScript domain modules so automated tests can exercise the booking rules without rendering the UI.

`runScenario(id)` accepts a scenario identifier and returns a complete immutable report: title, severity, ordered events, final booking state, reliability score, and remediation. React owns only selected-scenario and run-progress state. CSS provides the visual system without a component library.

## Components

| Component | Responsibility |
| --- | --- |
| `app/domain/types.ts` | Shared scenario, event, and report types. |
| `app/domain/scenarios.ts` | Static scenario definitions and practical recommendations. |
| `app/domain/bookingEngine.ts` | Deterministic booking-safety rules and scenario runner. |
| `app/domain/bookingEngine.test.ts` | Unit tests for booking outcomes and event ordering. |
| `app/page.tsx` | Dashboard composition and selected/run state. |
| `app/components/ScenarioCard.tsx` | Accessible selectable scenario card. |
| `app/components/RunTimeline.tsx` | Ordered event timeline with simulated progression. |
| `app/components/ReliabilityReport.tsx` | Final state, score, and remediation display. |
| `app/globals.css` | Responsive visual system. |

## Safety and privacy constraints

- All scenario names, people, booking references, and times are fictional.
- Do not accept, process, transmit, or persist payment data.
- Do not include secrets, API keys, real endpoints, credentials, customer information, or production integration code.
- Label all outcomes as simulations.
- The public repository includes only synthetic data.

## Error handling

The domain runner throws an explicit error for an unknown scenario identifier. The UI derives scenario choices only from the static definitions, so a normal visitor cannot reach that state. Tests cover the error to keep the contract clear.

## Testing and verification

Tests must be written first for each booking rule. The suite verifies exactly one confirmation in the race scenario, cancellation of an expired hold, idempotent duplicate callbacks, rejection of a time-zone mismatch, event sequence ordering, and unknown-scenario failure.

Before handoff, run the full test suite, the production build, and a browser smoke test that selects and runs each scenario.

## Explicit approval

The user selected SlotShield, requested a website, and explicitly said to start work. This design records the resulting approved v1 scope. KinVault remains a separate future project.

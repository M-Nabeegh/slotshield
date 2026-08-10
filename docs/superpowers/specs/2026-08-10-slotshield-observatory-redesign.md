# SlotShield Reliability Observatory Redesign

## Purpose

SlotShield should make a booking failure understandable to a normal visitor in under one minute. The visitor opens a public link, chooses a scenario, runs a fictional event trace, and sees the protection and final state. The surface should feel like a focused SaaS product workspace that a team could use and share with a client, not like a static portfolio mockup. No account, data upload, or technical setup should block the first test.

The redesign keeps SlotShield a synthetic browser simulator. It changes the visual language and the visitor flow without adding booking, payment, calendar, authentication, or customer-data integrations.

## Audience and single job

The audience includes developers, product teams, and clients who want to see how a booking system handles edge cases. The page has one job: let a visitor try a failure mode and understand what the guardrail did.

## SaaS product surface

The shell should communicate “working product” within the first glance:

- A persistent product header with the SlotShield mark, a compact `Simulator` section label, `PUBLIC PREVIEW` status, and `Copy share link` action.
- A small workspace context row such as `Reliability lab / Booking flows` so the page feels like an active product area rather than a landing-page illustration.
- A primary action hierarchy: `Try this scenario` or `Run scenario` is the dominant control; secondary actions are scenario switching and sharing.
- Product-style trust cues beside the simulator: `Synthetic data`, `No account required`, `Deterministic trace`, and `No integrations connected`.
- A report surface that reads like an operational SaaS result: protection status, final booking state, event timeline, and one recommended guardrail.
- Avoid fake navigation, pricing claims, customer logos, user avatars, or settings that do not work. Every visible control must either operate locally or be clearly presented as a non-interactive label.

## Visual direction

The design direction is **Reliability Observatory**: Apple-like calm, tactile surfaces, and a visible instrument for the booking slot.

### Token system

| Role | Value | Use |
| --- | --- | --- |
| Porcelain | `#F5F4EF` | Main canvas and breathing room. |
| Graphite | `#11151D` | Primary type and dark instrument surfaces. |
| Signal violet | `#6D63FF` | Active controls and focus states. |
| Protected mint | `#37D5B0` | Accepted events and healthy states. |
| Conflict coral | `#F06B68` | Rejected or unsafe outcomes. |
| Warm amber | `#E9A943` | Holds, warnings, and pending events. |

### Type and layout

- Use `Avenir Next` or `SF Pro Display` for display text, `SF Pro Text` for body copy, and `SF Mono` for timestamps and event labels. Fall back to system sans and monospace families on other platforms.
- Use generous type scale and whitespace. Let the event trace carry density instead of filling every section with cards.
- Keep the navigation compact but product-like: SlotShield mark, `Simulator` label, `PUBLIC PREVIEW` status, and a `Copy share link` action.

### Signature element

The hero opens with a live slot rail for `10:15`. Two request lines approach one slot marker; the accepted line resolves in mint and the conflict line resolves in coral. This rail explains the product before the visitor reads the copy and becomes the visual motif for the timeline below.

## Visitor flow

```text
PUBLIC LINK
    |
    v
Hero: “Rehearse the moment booking trust breaks.”
    |
    +--> Try this scenario: Double-booking race
    |        |
    |        v
    |    Run fake trace -> event rail -> reliability result
    |
    +--> Choose another mode: expired hold / duplicate callback / time zone
    |
    +--> Copy share link for a client or teammate
```

The first screen shows a clear `Try this scenario` button. Scenario choices stay visible and use plain language. Running a scenario updates the trace and reveals a result block with the score, final state, and one practical protection. The interface labels the sandbox as synthetic near the first action and in the public-access surface.

## Public client access

The deployment remains public and account-free. The page should make the access path obvious:

- Show `PUBLIC PREVIEW` in the top bar.
- Show the canonical current URL in a compact `Share this sandbox` panel near the result or footer.
- Provide `Copy share link`; use the Clipboard API on HTTPS and show `Link copied` for two seconds.
- If clipboard access fails, show the URL with a text-selection-friendly fallback and the instruction `Select and copy this link`.
- Keep the existing public URL stable: `https://slotshield-lab.jatnabeegh.chatgpt.site`.

The public surface never asks a visitor to sign in. It stores no visitor state and sends no visitor data to a backend.

## Responsive behavior

- Wide screens use a two-column observatory: slot rail and scenario briefing on the left, event trace and result on the right.
- Wide screens use a centered SaaS workspace frame with a persistent product header, context row, and two-column observatory: slot rail and scenario briefing on the left, event trace and result on the right.
- Tablet screens collapse the result below the trace while keeping the scenario picker horizontal and scrollable.
- Phones use a single column, 44px minimum touch targets, a sticky `Run scenario` action after a mode is chosen, and no horizontal overflow.
- Keyboard focus remains visible. Reduced-motion users receive static transitions and no animated rail movement.

## Component boundaries

| Component | Responsibility |
| --- | --- |
| `SlotRail` | Hero slot visual and accepted/conflict signal states. |
| `PublicAccessBar` | Public status, current URL, clipboard action, and fallback message. |
| `ScenarioPicker` | Scenario selection with accessible pressed state. |
| `ScenarioBriefing` | Plain-language risk, protection, and run action. |
| `SimulationTimeline` | Ordered deterministic event trace. |
| `ReliabilityReport` | Score, final state, recommendation, and share surface. |
| `app/page.tsx` | Owns selected scenario, run state, and composition only. |

The domain engine remains unchanged. React derives the selected report from `runScenario(selectedId)`, and the browser owns only transient UI state such as the selected scenario, run state, and copy confirmation.

## States and error handling

- Before a run, show `Ready to test` and explain that the trace uses fictional data.
- After a run, show the event order and final state without artificial delays.
- If copying fails, preserve the URL and show the manual-copy fallback. Do not treat clipboard failure as a simulation failure.
- Keep unknown scenario errors inside the domain contract; the static picker cannot emit unknown IDs.

## Acceptance criteria

- A visitor can open the public URL without authentication.
- The first viewport reads as a polished SaaS product workspace, with a working primary action and no placeholder navigation.
- A first-time visitor can run a scenario in one clear action.
- All four scenarios remain selectable and deterministic.
- The slot rail and event trace communicate accepted, rejected, pending, and ignored outcomes.
- Desktop and mobile layouts have no clipping or horizontal scroll.
- Copy-link success and failure states are accessible and testable.
- Existing synthetic-data and no-integration safety boundaries remain intact.

## Explicit approval

The user approved the Reliability Observatory direction and added the requirement that normal visitors can test the simulator without signing in. This document is ready for review before implementation begins.

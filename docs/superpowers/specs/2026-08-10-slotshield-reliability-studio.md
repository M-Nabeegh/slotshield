# SlotShield Reliability Studio redesign

## Purpose

The current SlotShield page looks like a visual simulator first and a useful
client product second. The Reliability Studio redesign makes the first job
obvious: a visitor can paste a public appointment URL, run a safe surface
check, understand what was observed, and then choose whether to connect a
staging-only adapter or rehearse a fictional failure mode.

This is a focused product-surface redesign. It does not add authentication,
booking, payment, calendar, customer-data, analytics, or production-system
integrations.

## Audience and single job

The audience is a clinic owner, product manager, engineer, or prospective
employer evaluating whether SlotShield is a credible reliability tool. The
page has one primary job:

> Show a visitor how SlotShield tests appointment reliability, then let them
> start a safe test without creating an account.

The page must communicate the product in the first viewport before asking the
visitor to understand simulation terminology.

## Design direction: Reliability Studio

Reliability Studio is a calm, premium SaaS workspace built around a visible
preflight instrument. It should feel precise and considered rather than
decorative or dashboard-generic.

### Visual decisions

- Keep the existing SlotShield porcelain and graphite identity, but lower the
  background glow and remove visual noise from the first viewport.
- Use sentence case for interface labels and section headings. Uppercase mono
  type is reserved for URLs, timestamps, and actual test-status metadata.
- Use a restrained display scale so the headline has authority without
  dominating the whole screen.
- Keep signal violet as the primary action color, protected mint for verified
  and accepted states, conflict coral for rejected states, and warm amber for
  attention states.
- Use one signature visual: the preflight console showing a public surface
  check, a staging adapter path, and fictional scenario tests as three distinct
  states.
- Use a single system-derived sans family for display and body text, with the
  existing mono fallback only for machine-readable values. Do not add a
  decorative serif or a second display family.
- Replace repeated pill labels with clear hierarchy, generous spacing, and
  quiet dividers. A status chip is used only when it conveys live state.

### Portfolio quality bar

This is a flagship portfolio product, not a generic SaaS landing page. The
implementation should be restrained, precise, calm, and native-quality. It
must actively avoid giant gradient blobs, excessive glow, purple-heavy
surfaces, unnecessary glassmorphism, endless nested cards, decorative charts,
fake metrics, arbitrary gradient text, excessive shadows, and animations that
do not clarify state. If an element does not improve comprehension, trust,
interaction, or hierarchy, it is removed.

The preflight console is one instrument with three modes, not three equal
marketing cards: `Public surface` is the active read-only path, `Staging
adapter` is the quiet test-only path, and `Fictional scenarios` is the local
rehearsal path. The active mode is obvious through hierarchy and signal color;
inactive modes stay quiet.

Evidence details may be shown only when they exist in the current response
contract, such as HTTP status, response time, same-origin links, detected
booking terms, and the applied boundary. The redesign must not invent uptime,
conversion, safety, or reliability metrics.

Motion is nearly invisible: short state transitions, a refined hover/focus
response, and a subtle console change are sufficient. No bouncing, parallax,
floating decoration, animated gradients, or ubiquitous glow. Reduced motion
preserves every state change without relying on animation.

### Information architecture

```text
Product header
  SlotShield · Simulator · public preview · share

Hero / first action
  Find the booking failures customers never see.
  Plain-language explanation
  Public URL input + Check site
  Preflight console preview

How it works
  1 Add your public link
  2 Review the reachable surface
  3 Test staging safely

Public surface result
  Observed facts, boundary, and next action

Failure library
  Four deterministic scenario modes

Simulation workbench
  Selected risk → event trace → protection → final state

Share / footer
  Stable public preview URL and no-real-actions boundary
```

The first action and the explanatory path are adjacent. The existing
simulator remains available below them, but a first-time visitor is not
required to understand the simulator before using the product check.

## Visitor flow and data boundaries

```text
Public link
    |
    v
Paste HTTPS appointment URL
    |
    v
POST /api/website-check (bounded, read-only GET)
    |
    +--> Verified public facts + explicit limits
    |
    +--> Audit a staging flow (test URL + temporary token)
    |
    +--> Try a fake scenario (local deterministic engine)
```

The URL check continues to use the existing HTTPS-only validation, bounded
response size, timeout, redirect revalidation, same-origin link extraction,
and read-only request policy. A public result must never imply that private
booking or payment behavior was proven.

The staging path remains visibly separate from the public check and continues
to require a test-only URL and temporary token. Tokens are held only in
transient browser state for the request and are cleared after a successful
run. The local scenario path continues to use fictional deterministic data.

## Component design

### `ProductHero`

Owns the first-viewport thesis, plain-language supporting copy, the public URL
form, trust boundary copy, and a visual link to the preflight console. It
receives website-check state through the existing audit-panel boundary rather
than owning network logic.

### `HowItWorks`

Renders the real three-step client path. Steps are numbered because they are a
sequential workflow, not decoration. Each step has a short action label and a
one-sentence explanation. The final step links to the staging section without
pretending that setup is already complete.

### `WebsiteAuditPanel`

Keeps the existing request and result contracts but changes the visual and
content hierarchy:

- The public check is the primary panel and uses a direct action label.
- Results lead with what was observed, then show four compact facts, findings,
  and the limit of the check.
- Staging is an explicit secondary path with test-environment language.
- Fake scenarios remain a clear local escape hatch.
- Loading, blocked URLs, network errors, and empty results each explain what
  the visitor can do next.

### Existing simulator components

`ScenarioPicker`, `ScenarioBriefing`, `SlotRail`, `SimulationTimeline`,
`ReliabilityReport`, `Metric`, and `PublicAccessBar` keep their current
behavioral contracts. Their styling is updated to use the same hierarchy,
spacing, and signal tokens as the studio shell.

`app/page.tsx` remains a composition layer. It owns selected scenario and
transient run state, while network and domain logic stay in their existing
modules.

### Footer credit

The footer stays concise and useful. Under the stable preview and no-real-
actions boundary, it includes the attribution:

> Designed and engineered by Muhammad Nabeegh

The credit is quiet, sentence case, and visually secondary to the product
surface. It is not presented as a fake customer or marketing claim.

## Responsive and accessibility behavior

- Desktop uses a balanced two-column hero: explanatory action surface on the
  left, preflight console on the right.
- Tablet collapses the console below the first action while keeping the
  three-step guide readable in one row where space allows.
- Mobile uses a single-column order: headline, URL check, console summary,
  steps, result, scenarios, and simulator.
- The layout must remain usable at 390px wide with no horizontal overflow.
- All interactive controls are at least 44px tall on touch layouts.
- Labels remain associated with their inputs, focus rings remain visible, and
  async result changes use live/status semantics without stealing focus from
  unrelated controls.
- Reduced-motion users receive the same state changes without rail movement or
  decorative animation.

## Error and empty states

- Empty public-check state says what URL belongs there and what the check does
  not do.
- Checking state uses a stable action label plus a compact progress indicator;
  it must not cause layout shift.
- Blocked or invalid URLs explain the safe boundary and give an actionable
  correction.
- Network failure says the public surface could not be verified and preserves
  the entered URL for retry.
- A successful result distinguishes verified public facts from unverified
  private behavior.
- Staging errors identify whether the URL, token, adapter contract, or remote
  response caused the stop without exposing the token.
- The simulator's pre-run state invites a fake run rather than displaying a
  dead empty dashboard.

## Verification contract

Before deployment, verify:

1. The first viewport explains the product and presents `Check site` without
   requiring sign-in.
2. The three how-it-works steps are visible and correctly link to the public
   check, result boundary, and staging path.
3. The public check still validates safe HTTPS URLs and renders verified facts,
   findings, booking links, and explicit limitations.
4. Staging remains test-only and does not leak the temporary token in the DOM,
   URL, or result copy.
5. All four deterministic scenarios remain selectable and produce the same
   trace/report contracts.
6. Copy-share-link success and manual fallback still work.
7. Keyboard focus, reduced motion, desktop layout, and 390px mobile layout
   are checked in tests or browser verification.
8. `npm test`, `npm run lint`, `npm run test:site`, and the production
   dependency audit remain green.
9. Browser review covers the desktop first viewport, successful and failed
   public checks, staging form, selected and completed fictional scenarios,
   390px mobile, keyboard focus, and reduced-motion behavior.
10. The footer renders `Designed and engineered by Muhammad Nabeegh` without
    competing with the primary product action.

## Implementation slices and commit policy

The redesign is intentionally split into reviewable checkpoints:

1. Design spec and implementation plan.
2. First-viewport hero and how-it-works structure.
3. Public-check panel hierarchy and state styling.
4. Scenario/workbench visual unification.
5. Responsive, focus, and reduced-motion polish.
6. Tests, README/project presentation, browser verification, and deployment.

Each checkpoint gets a focused commit and is pushed to the configured feature
branch. Empty or cosmetic-only commits are not created solely to inflate the
history; the visible commit trail should show real product decisions an
employer can inspect.

## Explicit approval

The user approved the Reliability Studio direction: a premium, client-friendly
SaaS surface with an obvious public website check, a visible three-step
explanation, a preflight console signature, and the existing fake simulation
workflow preserved below it.

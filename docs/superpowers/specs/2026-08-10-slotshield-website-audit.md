# SlotShield website audit and client onboarding

**Date:** 2026-08-10  
**Status:** Design approved by user; implementation pending

## Goal

Give an appointment-system owner a clear path from the public SlotShield demo to
a safe check of their own booking website. A client should be able to paste a
public URL, understand what SlotShield can verify immediately, and see the
separate requirements for deeper booking-flow tests.

## Product promise

SlotShield can verify the public surface of a website from its URL. It must not
pretend that a public page check proves that private booking, payment, or
database behavior is safe. Deeper reliability tests run only against a
client-provided staging/test system or redacted request/response examples.

## User journey

1. The visitor opens the public SlotShield preview and chooses **Test your
   website**.
2. They paste an `https://` website URL and submit it.
3. SlotShield performs a bounded public-site check and reports:
   - reachability and HTTP status;
   - HTTPS usage;
   - response time;
   - page title and content type;
   - whether booking-related language or links were found.
4. The result explains that this is a public-surface check, not a booking
   backend audit.
5. The visitor can continue to **Audit a staging flow**. That screen offers
   two honest paths:
   - connect a staging/test URL with a temporary test token; or
   - upload redacted request/response examples for a contract review.
6. Until a supported staging contract or examples are supplied, the visitor
   can run SlotShield's existing deterministic fake scenarios as a preview.
7. The report shows passed checks, failed checks, evidence, and the next safe
   action. It does not claim a pass when the deeper system was not tested.

## Visual direction

The feature belongs in the existing porcelain/graphite observatory instead of
looking like a generic URL utility. Add one high-contrast **Test your website**
card between the hero and scenario picker:

```text
  [ Test your website ]                         [ public check ]
  Paste the booking URL. We will inspect the public surface only.
  [ https://your-clinic.com                         ] [ Check site ]
  No login  ·  No booking actions  ·  No patient data

  ───────────── after a check ─────────────
  Site reachable       Booking page found       HTTPS active
  200 OK                /appointments           Protected
  [ Audit a staging flow ]       [ Try a fake scenario ]
```

The card should use sentence case, the existing system typography, and a single
violet-to-mint signal transition for the result state. Avoid a crawler-like
dashboard or dense telemetry labels. Errors should say what the client can fix
(for example, “This link redirects to a login page; provide a public landing
page or staging URL.”).

## Architecture

### Public website check

- Add a client component for the URL form and result states: idle, checking,
  success, and actionable error.
- Add a server route at `POST /api/website-check` so the browser is not blocked
  by cross-origin policy and the remote site is not fetched directly from the
  user's browser.
- The route accepts one URL, performs a bounded `GET`, and returns a small JSON
  result. It should inspect only the first response body needed for title and
  booking-language discovery.
- Follow redirects manually and re-apply the safety validation at every hop.
- Discovery is deliberately shallow: the homepage plus at most three same-origin
  links whose text or path suggests booking (`book`, `appointment`, `schedule`,
  `reserve`, or `contact`). No whole-site crawl.

### Staging-flow handoff

- The first release presents the staging/test connection contract and keeps the
  existing fake scenarios available when no connection is configured.
- A future adapter can accept a staging base URL, one-time token, test slot, and
  explicit reset capability. It must run only synthetic requests and return
  evidence for each scenario.
- Redacted examples remain a review path, not an automatic production replay.
- Do not store client URLs, tokens, request bodies, or reports in this release.

### Safety boundary

- Accept `https` by default; reject unsupported schemes, credentials in URLs,
  localhost names, private/reserved IP literals, and local-only hostnames.
- Enforce a short timeout, a response-size limit, a page-count limit, and a
  same-origin redirect/link policy.
- Never issue booking, payment, cancellation, webhook, or mutation requests to
  the submitted website.
- Return a clear “could not verify” state for timeouts, blocked responses,
  non-HTML content, login walls, and malformed URLs.

## Testing and acceptance criteria

- Unit tests cover URL validation, rejected local targets, redirect checks, and
  booking-page keyword discovery.
- Route tests mock `fetch` and cover success, timeout, non-HTML, oversized, and
  redirect responses without making network calls.
- Component tests cover submit, loading, success, actionable error, and the
  handoff to staging/fake scenarios.
- Server-rendered HTML still contains the public preview and existing scenario
  entry points.
- Playwright verifies desktop and mobile layout, keyboard focus, no horizontal
  overflow, and the complete public check flow.
- The public deployment remains open without ChatGPT sign-in, while the UI
  clearly labels the audit as read-only and synthetic.

## Non-goals for this release

- Connecting to a client's production system.
- Sending real booking, payment, cancellation, or webhook requests.
- Storing client projects, tokens, URLs, or reports.
- Full-site crawling, search-engine discovery, or automatic code changes.
- Claiming backend reliability from a public URL alone.

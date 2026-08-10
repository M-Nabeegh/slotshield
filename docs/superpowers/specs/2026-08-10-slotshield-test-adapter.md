# SlotShield test adapter contract

**Contract version:** 1  
**Status:** Draft for client integrations

SlotShield can inspect a public website from its URL, but backend reliability
tests require a client-owned staging environment. This contract lets an
appointment system expose synthetic, test-only behavior without giving
SlotShield permission to touch production bookings or payments.

## Safety requirements

- The base URL must point to a staging or test environment.
- The manifest must return `testOnly: true`.
- The client should issue a short-lived token scoped only to these endpoints.
- The adapter must use synthetic slot, patient, and payment identifiers.
- The adapter must reset its test state after each run or isolate every run by
  a request-provided test namespace.
- SlotShield never stores the token or request bodies.

## Endpoints

Expose these paths under the staging base URL:

```text
GET  /.well-known/slotshield-test.json
POST /.well-known/slotshield-test/run
```

The manifest response must be JSON:

```json
{
  "contractVersion": 1,
  "supports": ["race", "expired-hold", "duplicate-callback", "timezone"],
  "testOnly": true
}
```

The run request is JSON and carries the temporary token in the Authorization
header:

```json
{
  "mode": "synthetic",
  "scenarios": ["race", "duplicate-callback"],
  "testNamespace": "slotshield-run-unique-id"
}
```

The response should include only the supported result fields:

```json
{
  "status": "verified",
  "scenarios": [
    {
      "id": "race",
      "status": "passed",
      "evidence": "Second claim returned a conflict without creating a second booking."
    },
    {
      "id": "duplicate-callback",
      "status": "attention",
      "evidence": "The retry was accepted twice; add provider-event idempotency."
    }
  ]
}
```

Allowed scenario IDs are `race`, `expired-hold`, `duplicate-callback`, and
`timezone`. Allowed scenario statuses are `passed`, `attention`, and
`not-tested`. SlotShield truncates evidence and discards unknown response
fields before showing the result to a client.

If the manifest is missing, is not version 1, or does not explicitly declare
`testOnly: true`, SlotShield stops and explains how to configure staging. It
does not guess, retry against another path, or fall back to production.

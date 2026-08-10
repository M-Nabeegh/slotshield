import type { ScenarioDefinition } from "./types";

export const scenarios: ScenarioDefinition[] = [
  {
    id: "race",
    category: "Concurrency",
    title: "Double-booking race",
    description:
      "Two customers claim one appointment slot milliseconds apart.",
    risk: "Duplicate appointments and frustrated customers.",
    protection: "Database-level unique active-slot constraint.",
  },
  {
    id: "expired-hold",
    category: "Payments",
    title: "Expired payment hold",
    description:
      "A pending payment reservation blocks a slot after its hold window ends.",
    risk: "Real availability disappears behind stale reservations.",
    protection: "Expire stale holds before every availability check.",
  },
  {
    id: "duplicate-callback",
    category: "Webhooks",
    title: "Duplicate payment callback",
    description:
      "A provider retries a successful payment callback after a transient network failure.",
    risk: "Duplicate confirmations, receipts, or side effects.",
    protection: "Persist and enforce provider-event idempotency keys.",
  },
  {
    id: "timezone",
    category: "Time integrity",
    title: "Time-zone mismatch",
    description:
      "A client submits a local time that does not map to the clinic's schedule.",
    risk: "Customers arrive at a time that was never a valid slot.",
    protection: "Normalize to an explicit IANA time zone before validation.",
  },
];

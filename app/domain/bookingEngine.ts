import type { ScenarioId, ScenarioReport } from "./types";

export function runScenario(id: ScenarioId): ScenarioReport {
  if (id === "race") {
    return runRaceScenario();
  }

  if (id === "expired-hold") {
    return runExpiredHoldScenario();
  }

  if (id === "duplicate-callback") {
    return runDuplicateCallbackScenario();
  }

  if (id === "timezone") {
    return runTimezoneScenario();
  }

  throw new Error(`Unknown scenario: ${id}`);
}

function runRaceScenario(): ScenarioReport {
  return {
    id: "race",
    title: "Double-booking race",
    severity: "critical",
    events: [
      {
        order: 1,
        time: "10:00:00.000",
        actor: "Request A",
        message: "Claims 10:15 appointment slot.",
        outcome: "received",
      },
      {
        order: 2,
        time: "10:00:00.008",
        actor: "Request B",
        message: "Claims the same 10:15 appointment slot.",
        outcome: "received",
      },
      {
        order: 3,
        time: "10:00:00.014",
        actor: "Uniqueness guard",
        message: "Confirms Request A as the first valid claim.",
        outcome: "accepted",
      },
      {
        order: 4,
        time: "10:00:00.017",
        actor: "Uniqueness guard",
        message: "Rejects Request B because the slot is already reserved.",
        outcome: "rejected",
      },
    ],
    finalState: {
      confirmedBookings: 1,
      rejectedRequests: 1,
      cancelledHolds: 0,
      ignoredCallbacks: 0,
      summary: "One patient holds the slot; the competing request receives a conflict.",
    },
    reliabilityScore: 94,
    recommendation:
      "Enforce a unique active-slot constraint in the database and map conflicts to a clear retry response.",
  };
}

function runExpiredHoldScenario(): ScenarioReport {
  return {
    id: "expired-hold",
    title: "Expired payment hold",
    severity: "high",
    events: [
      {
        order: 1,
        time: "09:44:00",
        actor: "Payment hold",
        message: "Reserves the 10:30 appointment while payment is pending.",
        outcome: "received",
      },
      {
        order: 2,
        time: "10:01:00",
        actor: "Hold expiry job",
        message: "Cancels the hold after the 15-minute payment window.",
        outcome: "accepted",
      },
      {
        order: 3,
        time: "10:02:00",
        actor: "Request C",
        message: "Claims the now-available 10:30 appointment slot.",
        outcome: "received",
      },
      {
        order: 4,
        time: "10:02:00.010",
        actor: "Booking guard",
        message: "Confirms the new booking after stale-hold cleanup.",
        outcome: "accepted",
      },
    ],
    finalState: {
      confirmedBookings: 1,
      rejectedRequests: 0,
      cancelledHolds: 1,
      ignoredCallbacks: 0,
      summary: "The stale payment hold is cancelled before a new patient books the slot.",
    },
    reliabilityScore: 91,
    recommendation:
      "Expire payment-pending reservations before availability checks and record the cancellation reason.",
  };
}

function runDuplicateCallbackScenario(): ScenarioReport {
  return {
    id: "duplicate-callback",
    title: "Duplicate payment callback",
    severity: "high",
    events: [
      {
        order: 1,
        time: "11:00:00.000",
        actor: "Payment provider",
        message: "Delivers successful callback pay_evt_2048.",
        outcome: "received",
      },
      {
        order: 2,
        time: "11:00:00.011",
        actor: "Idempotency guard",
        message: "Confirms the booking and stores pay_evt_2048.",
        outcome: "accepted",
      },
      {
        order: 3,
        time: "11:00:01.402",
        actor: "Payment provider",
        message: "Retries the same successful callback pay_evt_2048.",
        outcome: "received",
      },
      {
        order: 4,
        time: "11:00:01.405",
        actor: "Idempotency guard",
        message: "Ignores the duplicate callback without creating another booking.",
        outcome: "ignored",
      },
    ],
    finalState: {
      confirmedBookings: 1,
      rejectedRequests: 0,
      cancelledHolds: 0,
      ignoredCallbacks: 1,
      summary: "One payment event confirms one booking, even when the provider retries it.",
    },
    reliabilityScore: 93,
    recommendation:
      "Persist provider event IDs and treat repeated successful callbacks as no-op events.",
  };
}

function runTimezoneScenario(): ScenarioReport {
  return {
    id: "timezone",
    title: "Time-zone mismatch",
    severity: "medium",
    events: [
      {
        order: 1,
        time: "14:00:00+04:00",
        actor: "Client",
        message: "Submits 14:00 as if it were the clinic's local appointment time.",
        outcome: "received",
      },
      {
        order: 2,
        time: "14:00:00+04:00",
        actor: "Slot validator",
        message: "Normalizes the request to the clinic's Asia/Karachi schedule.",
        outcome: "received",
      },
      {
        order: 3,
        time: "14:00:00+04:00",
        actor: "Slot validator",
        message: "Rejects the request because the normalized time has no matching clinic slot.",
        outcome: "rejected",
      },
    ],
    finalState: {
      confirmedBookings: 0,
      rejectedRequests: 1,
      cancelledHolds: 0,
      ignoredCallbacks: 0,
      summary: "The request is rejected before it can reserve a slot under the wrong local time.",
    },
    reliabilityScore: 88,
    recommendation:
      "Store slot instants with an explicit IANA time zone and validate submitted times after normalization.",
  };
}

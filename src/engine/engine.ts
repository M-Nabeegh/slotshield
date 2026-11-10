import {
  HOLD_MS,
  clinic,
  formatOffset,
  isoOffset,
  formatSlot,
  isValidSlot,
  providerName,
  slotKey,
} from "./clinic";
import { getScenario } from "./scenarios";
import type {
  Booking,
  BookingRequest,
  Guardrails,
  Incident,
  Outcome,
  RunResult,
  RunSummary,
  ScenarioId,
  SimEvent,
} from "./types";

type Step =
  | { kind: "arrive"; request: BookingRequest }
  | { kind: "read"; request: BookingRequest; slot: number; claim?: boolean }
  | { kind: "write"; request: BookingRequest; slot: number; claim?: boolean }
  | { kind: "abandon"; request: BookingRequest }
  | { kind: "cancel"; request: BookingRequest }
  | { kind: "webhook"; request: BookingRequest; eventId: string; delivery: number };

interface Queued {
  t: number;
  seq: number;
  step: Step;
}

const DEFAULT_READ_MS = 4;
const DEFAULT_WRITE_MS = 6;
const DEFAULT_CLAIM_MS = 20_000;

/**
 * Runs one scenario against a model of a clinic booking API.
 *
 * The model is a small discrete-event simulation. Each booking request reads
 * availability, waits a few milliseconds, then writes. Without a unique
 * constraint the read decides, so two requests whose reads overlap both win.
 * Every guardrail changes one real decision point; nothing is scripted.
 */
export function simulate(
  scenarioId: ScenarioId,
  guardrails: Guardrails,
  seed = 1,
): RunResult {
  const scenario = getScenario(scenarioId);
  const requests = scenario.build(seed);
  const queue: Queued[] = [];
  const bookings: Booking[] = [];
  const events: SimEvent[] = [];
  const snapshots: Booking[][] = [];
  const processedEvents = new Set<string>();
  /** Patients waiting for a taken slot, oldest first. */
  const waitlists = new Map<string, BookingRequest[]>();
  /** Where each notified patient stood in line; lower waited longer. */
  const linePosition = new Map<string, number>();
  let seq = 0;
  let refunds = 0;
  let correctlyRefused = 0;

  const schedule = (t: number, step: Step) => {
    queue.push({ t, seq: seq++, step });
  };

  const emit = (
    t: number,
    actor: string,
    message: string,
    outcome: Outcome,
    options: { slot?: [string, number]; customer?: string; incidents?: Incident[] } = {},
  ) => {
    events.push({
      index: events.length,
      t,
      actor,
      message: message.replace(/\.\./g, "."),
      outcome,
      slotKey: options.slot ? slotKey(options.slot[0], options.slot[1]) : null,
      customer: options.customer ?? null,
      incidents: options.incidents ?? [],
    });
    snapshots.push(bookings.map((booking) => ({ ...booking })));
  };

  const activeOn = (provider: string, slot: number) =>
    bookings.filter(
      (booking) =>
        booking.provider === provider &&
        booking.slot === slot &&
        booking.status !== "released",
    );

  const isStale = (booking: Booking, t: number) =>
    booking.status === "held" && booking.holdExpiresAt !== null && booking.holdExpiresAt <= t;

  const sweep = (t: number, provider: string, slot: number) => {
    for (const booking of activeOn(provider, slot)) {
      if (isStale(booking, t)) {
        booking.status = "released";
        emit(
          t,
          "Hold sweeper",
          `Releases ${booking.customer}'s unpaid hold on ${formatSlot(slot)}; the payment window closed ${minutesAgo(booking.holdExpiresAt!, t)}.`,
          "ok",
          { slot: [provider, slot], customer: booking.customer },
        );
      }
    }
  };

  /** A notified waitlist patient finds the freed slot already gone. */
  const refuseClaim = (
    t: number,
    actor: string,
    request: BookingRequest,
    holder: Booking,
    slot: number,
  ) => {
    const who = request.customer;
    const mine = linePosition.get(request.id) ?? 0;
    const theirs = linePosition.get(holder.requestId);
    if (theirs !== undefined && theirs < mine) {
      correctlyRefused += 1;
      emit(
        t,
        actor,
        `${formatSlot(slot)} went to ${holder.customer}, who was ahead of ${who} on the waitlist.`,
        "rejected",
        { slot: [request.provider, slot], customer: who },
      );
      return;
    }
    const reason = theirs === undefined
      ? "who was never on the waitlist"
      : `who joined the waitlist after ${who}`;
    emit(
      t,
      actor,
      `${formatSlot(slot)} already went to ${holder.customer}, ${reason}. ${who} was ahead in line and is passed over.`,
      "incident",
      {
        slot: [request.provider, slot],
        customer: who,
        incidents: [{ type: "passed-over", cause: "waitlist-claim", customer: who }],
      },
    );
  };

  for (const request of requests) {
    schedule(request.at, { kind: "arrive", request });
  }

  while (queue.length > 0) {
    queue.sort((a, b) => a.t - b.t || a.seq - b.seq);
    const { t, step } = queue.shift()!;
    const { request } = step;
    const who = request.customer;
    const doctor = providerName(request.provider);

    if (step.kind === "arrive") {
      const offset = request.clientOffsetMin ?? clinic.utcOffsetMin;
      const abroad = offset !== clinic.utcOffsetMin;
      let slot = request.slot;
      let message = `Picks ${formatSlot(request.slot)} with ${doctor}`;

      if (abroad) {
        message += ` from ${request.clientCity} (${formatOffset(offset)})`;
        const saved = request.profileOffsetMin;
        if (guardrails["tz-normalize"]) {
          message += `. The API reads it as clinic time: ${formatSlot(slot)}.`;
        } else if (saved !== undefined && saved !== offset) {
          slot = request.slot + (offset - saved);
          message += `. Their profile still says ${formatOffset(saved)} from before the clocks changed, so the API stores ${formatSlot(slot)} clinic time.`;
        } else {
          slot = request.slot + (clinic.utcOffsetMin - offset);
          message += `. The browser sends ${formatSlot(request.slot)}${isoOffset(offset)}, which the API stores as ${formatSlot(slot)} clinic time.`;
        }
      } else {
        message += ".";
      }

      emit(t, who, message, "info", { slot: [request.provider, request.slot], customer: who });
      schedule(t + (request.readMs ?? DEFAULT_READ_MS), { kind: "read", request, slot });
      continue;
    }

    if (step.kind === "read") {
      const { slot } = step;
      const shifted = slot !== request.slot;

      if (!isValidSlot(slot)) {
        emit(
          t,
          "Booking API",
          `No ${formatSlot(slot)} slot exists for ${doctor}. ${who} is told the time is unavailable.`,
          "incident",
          {
            slot: [request.provider, request.slot],
            customer: who,
            incidents: [{ type: "turned-away", cause: "tz-normalize", customer: who }],
          },
        );
        continue;
      }

      if (guardrails["hold-expiry"]) {
        sweep(t, request.provider, slot);
      }

      const occupying = activeOn(request.provider, slot);
      if (occupying.length > 0) {
        const holder = occupying[0];
        if (occupying.every((booking) => isStale(booking, t))) {
          emit(
            t,
            "Booking API",
            `${formatSlot(slot)} looks taken by ${holder.customer}'s hold, which expired ${minutesAgo(holder.holdExpiresAt!, t)}. ${who} is turned away from an open slot.`,
            "incident",
            {
              slot: [request.provider, slot],
              customer: who,
              incidents: [{ type: "turned-away", cause: "hold-expiry", customer: who }],
            },
          );
        } else if (shifted) {
          emit(
            t,
            "Booking API",
            `${formatSlot(slot)} is taken, so ${who} is refused, though ${formatSlot(request.slot)} was what they picked.`,
            "incident",
            {
              slot: [request.provider, slot],
              customer: who,
              incidents: [{ type: "turned-away", cause: "tz-normalize", customer: who }],
            },
          );
        } else if (occupying.every((booking) => booking.slot !== booking.intendedSlot)) {
          emit(
            t,
            "Booking API",
            `${formatSlot(slot)} is blocked by ${holder.customer}, who never asked for it. ${who} is turned away.`,
            "incident",
            {
              slot: [request.provider, slot],
              customer: who,
              incidents: [{ type: "turned-away", cause: "tz-normalize", customer: who }],
            },
          );
        } else if (step.claim) {
          refuseClaim(t, "Booking API", request, holder, slot);
        } else if (request.waitlist) {
          const key = slotKey(request.provider, slot);
          const line = waitlists.get(key) ?? [];
          line.push(request);
          waitlists.set(key, line);
          correctlyRefused += 1;
          emit(
            t,
            "Booking API",
            `${formatSlot(slot)} is already booked. ${who} joins the waitlist at number ${line.length}.`,
            "rejected",
            { slot: [request.provider, slot], customer: who },
          );
        } else {
          correctlyRefused += 1;
          emit(
            t,
            "Booking API",
            `${formatSlot(slot)} is already booked. ${who} is shown the next open times.`,
            "rejected",
            { slot: [request.provider, slot], customer: who },
          );
        }
        continue;
      }

      emit(t, "Booking API", `Sees ${formatSlot(slot)} as open for ${who}.`, "info", {
        slot: [request.provider, slot],
        customer: who,
      });
      schedule(t + (request.writeMs ?? DEFAULT_WRITE_MS), { kind: "write", request, slot, claim: step.claim });
      continue;
    }

    if (step.kind === "write") {
      const { slot } = step;
      const existing = activeOn(request.provider, slot);

      if (guardrails["slot-lock"] && existing.length > 0) {
        const stale = existing.every((booking) => isStale(booking, t));
        if (stale) {
          emit(
            t,
            "Database",
            `Unique constraint fires on a hold that already expired. ${who} is turned away from an open slot.`,
            "incident",
            {
              slot: [request.provider, slot],
              customer: who,
              incidents: [{ type: "turned-away", cause: "hold-expiry", customer: who }],
            },
          );
        } else if (step.claim) {
          refuseClaim(t, "Database", request, existing[0], slot);
        } else {
          correctlyRefused += 1;
          emit(
            t,
            "Database",
            `Unique constraint rejects ${who}'s insert: ${existing[0].customer} got there first. The API returns 409 and ${who} picks another time.`,
            "rejected",
            { slot: [request.provider, slot], customer: who },
          );
        }
        continue;
      }

      const booking: Booking = {
        id: `b${bookings.length + 1}`,
        requestId: request.id,
        customer: who,
        provider: request.provider,
        slot,
        intendedSlot: request.slot,
        status: request.payment ? "held" : "confirmed",
        holdExpiresAt: request.payment ? t + HOLD_MS : null,
        confirmations: request.payment ? 0 : 1,
      };
      bookings.push(booking);

      const incidents: Incident[] = [];
      if (existing.length > 0) {
        incidents.push({ type: "double-booking", cause: "slot-lock", customer: who });
      }
      if (slot !== request.slot && !request.payment) {
        incidents.push({ type: "wrong-time", cause: "tz-normalize", customer: who });
      }

      let message = request.payment
        ? `Holds ${formatSlot(slot)} for ${who} while they pay the deposit (10 min window).`
        : `Confirms ${formatSlot(slot)} with ${doctor} for ${who}.`;
      if (existing.length > 0) {
        message = `Writes ${who} into ${formatSlot(slot)}, which ${existing[0].customer} already has. ${formatSlot(slot)} is now double-booked.`;
      } else if (slot !== request.slot && !request.payment) {
        message += ` ${who} expects ${formatSlot(request.slot)}.`;
      }

      emit(t, "Database", message, incidents.length > 0 ? "incident" : "ok", {
        slot: [request.provider, slot],
        customer: who,
        incidents,
      });

      if (request.cancelAfterMs !== undefined && !request.payment) {
        schedule(t + request.cancelAfterMs, { kind: "cancel", request });
      }

      if (request.payment?.outcome === "abandoned") {
        schedule(t + request.payment.afterMs, { kind: "abandon", request });
      } else if (request.payment?.outcome === "paid") {
        const eventId = paymentEventId(request);
        const first = t + request.payment.afterMs;
        schedule(first, { kind: "webhook", request, eventId, delivery: 0 });
        (request.payment.retriesMs ?? []).forEach((retry, index) => {
          schedule(first + retry, { kind: "webhook", request, eventId, delivery: index + 1 });
        });
      }
      continue;
    }

    if (step.kind === "abandon") {
      const booking = latestBooking(bookings, request.id);
      emit(
        t,
        who,
        `Closes the payment page without paying. The hold on ${formatSlot(booking?.slot ?? request.slot)} stays until it expires.`,
        "info",
        { slot: [request.provider, booking?.slot ?? request.slot], customer: who },
      );
      continue;
    }

    if (step.kind === "cancel") {
      const booking = latestBooking(bookings, request.id);
      if (!booking || booking.status !== "confirmed") {
        continue;
      }
      booking.status = "released";
      const { slot } = booking;
      const slotRef: [string, number] = [booking.provider, slot];
      const key = slotKey(booking.provider, slot);
      const line = waitlists.get(key) ?? [];
      emit(t, who, `Cancels their ${formatSlot(slot)} appointment with ${doctor}.`, "info", {
        slot: slotRef,
        customer: who,
      });

      if (line.length === 0) {
        continue;
      }

      if (guardrails["waitlist-claim"]) {
        const next = line.shift()!;
        bookings.push({
          id: `b${bookings.length + 1}`,
          requestId: next.id,
          customer: next.customer,
          provider: booking.provider,
          slot,
          intendedSlot: slot,
          status: "confirmed",
          holdExpiresAt: null,
          confirmations: 1,
        });
        emit(
          t,
          "Database",
          `Gives ${formatSlot(slot)} to ${next.customer}, first on the waitlist, in the same transaction as the cancellation.`,
          "ok",
          { slot: slotRef, customer: next.customer },
        );
        continue;
      }

      waitlists.delete(key);
      emit(
        t,
        "Waitlist notifier",
        `Texts ${listNames(line.map((waiter) => waiter.customer))} that ${formatSlot(slot)} is open. Whoever taps first gets it.`,
        "info",
        { slot: slotRef },
      );
      line.forEach((waiter, position) => {
        linePosition.set(waiter.id, position);
        schedule(t + (waiter.claimMs ?? DEFAULT_CLAIM_MS), { kind: "read", request: waiter, slot, claim: true });
      });
      continue;
    }

    if (step.kind === "webhook") {
      const { eventId, delivery } = step;
      const label = delivery === 0 ? `Delivers ${eventId}` : `Retries ${eventId} (attempt ${delivery + 1})`;
      const booking = latestBooking(bookings, request.id);
      const slot = booking?.slot ?? request.slot;
      const slotRef: [string, number] = [request.provider, slot];

      if (guardrails.idempotency && processedEvents.has(eventId)) {
        emit(t, "Payment webhook", `${label}. Already processed, acknowledged with 200 and skipped.`, "skipped", {
          slot: slotRef,
          customer: who,
        });
        continue;
      }
      processedEvents.add(eventId);

      if (!booking) {
        continue;
      }

      if (booking.status === "confirmed") {
        booking.confirmations += 1;
        emit(
          t,
          "Payment webhook",
          `${label}. Processed again: ${who} gets receipt #${booking.confirmations} and the deposit is captured a second time.`,
          "incident",
          {
            slot: slotRef,
            customer: who,
            incidents: [{ type: "charged-twice", cause: "idempotency", customer: who }],
          },
        );
        continue;
      }

      const lapsed = booking.status === "released" || isStale(booking, t);
      const others = activeOn(booking.provider, booking.slot).filter((other) => other !== booking);
      if (lapsed && others.length > 0) {
        booking.status = "released";
        refunds += 1;
        emit(
          t,
          "Payment webhook",
          `${label}. The hold lapsed and ${others[0].customer} now has ${formatSlot(slot)}, so the deposit is refunded.`,
          "rejected",
          { slot: slotRef, customer: who },
        );
        continue;
      }

      booking.status = "confirmed";
      booking.holdExpiresAt = null;
      booking.confirmations = 1;
      const incidents: Incident[] = [];
      let message = `${label}. Payment confirmed: ${who} is booked for ${formatSlot(slot)}.`;
      if (booking.slot !== booking.intendedSlot) {
        incidents.push({ type: "wrong-time", cause: "tz-normalize", customer: who });
        message += ` They expect ${formatSlot(booking.intendedSlot)}.`;
      }
      emit(t, "Payment webhook", message, incidents.length > 0 ? "incident" : "ok", {
        slot: slotRef,
        customer: who,
        incidents,
      });
    }
  }

  return {
    scenarioId,
    seed,
    guardrails: { ...guardrails },
    requests,
    events,
    snapshots,
    summary: summarize(requests, bookings, events, correctlyRefused, refunds),
  };
}

function latestBooking(bookings: Booking[], requestId: string): Booking | undefined {
  for (let index = bookings.length - 1; index >= 0; index -= 1) {
    if (bookings[index].requestId === requestId) {
      return bookings[index];
    }
  }
  return undefined;
}

function listNames(names: string[]): string {
  if (names.length <= 1) {
    return names.join("");
  }
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function minutesAgo(expiredAt: number, now: number): string {
  const minutes = Math.max(1, Math.round((now - expiredAt) / 60_000));
  return `${minutes} min ago`;
}

function summarize(
  requests: BookingRequest[],
  bookings: Booking[],
  events: SimEvent[],
  correctlyRefused: number,
  refunds: number,
): RunSummary {
  const summary: RunSummary = {
    customers: new Set(requests.map((request) => request.customer)).size,
    confirmed: bookings.filter((booking) => booking.status === "confirmed").length,
    correctlyRefused,
    refunds,
    affectedCustomers: [],
    byType: { "double-booking": 0, "turned-away": 0, "charged-twice": 0, "wrong-time": 0, "passed-over": 0 },
    byCause: { "slot-lock": 0, "hold-expiry": 0, idempotency: 0, "tz-normalize": 0, "waitlist-claim": 0 },
  };
  const affected = new Set<string>();

  for (const event of events) {
    for (const incident of event.incidents) {
      summary.byType[incident.type] += 1;
      summary.byCause[incident.cause] += 1;
      affected.add(incident.customer);
    }
  }

  // The patient who already held a double-booked slot is affected too.
  for (const event of events) {
    if (event.incidents.some((incident) => incident.type === "double-booking") && event.slotKey) {
      const snapshot = bookings.filter(
        (booking) => slotKey(booking.provider, booking.slot) === event.slotKey && booking.status !== "released",
      );
      snapshot.forEach((booking) => affected.add(booking.customer));
    }
  }

  summary.affectedCustomers = [...affected].sort();
  return summary;
}

export function totalIncidents(summary: RunSummary): number {
  return Object.values(summary.byType).reduce((total, count) => total + count, 0);
}

function paymentEventId(request: BookingRequest): string {
  let hash = 2166136261;
  for (const char of `${request.id}:${request.customer}:${request.at}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  return `evt_1P${hash.toString(36).padStart(7, "0").slice(0, 7).toUpperCase()}`;
}

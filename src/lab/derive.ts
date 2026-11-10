import { formatSlot, slotKey } from "../engine/clinic";
import type { GuardrailId, IncidentType, RunResult } from "../engine/types";

export interface Progress {
  done: boolean;
  confirmed: number;
  refused: number;
  incidents: number;
  affected: string[];
  byType: Record<IncidentType, number>;
  byCause: Record<GuardrailId, number>;
}

/** Totals for everything that has happened up to and including `index`. */
export function progressAt(run: RunResult, index: number): Progress {
  const byType: Record<IncidentType, number> = {
    "double-booking": 0,
    "turned-away": 0,
    "charged-twice": 0,
    "wrong-time": 0,
    "passed-over": 0,
  };
  const byCause: Record<GuardrailId, number> = {
    "slot-lock": 0,
    "hold-expiry": 0,
    idempotency: 0,
    "tz-normalize": 0,
    "waitlist-claim": 0,
  };
  const affected = new Set<string>();
  let refused = 0;
  let incidents = 0;

  for (const event of run.events.slice(0, index + 1)) {
    if (event.outcome === "rejected") {
      refused += 1;
    }
    for (const incident of event.incidents) {
      incidents += 1;
      byType[incident.type] += 1;
      byCause[incident.cause] += 1;
      affected.add(incident.customer);
      if (incident.type === "double-booking" && event.slotKey) {
        const snapshot = run.snapshots[event.index];
        snapshot
          .filter((booking) => slotKey(booking.provider, booking.slot) === event.slotKey && booking.status !== "released")
          .forEach((booking) => affected.add(booking.customer));
      }
    }
  }

  const done = index >= run.events.length - 1;
  const snapshot = index >= 0 ? run.snapshots[index] : [];

  return {
    done,
    confirmed: snapshot.filter((booking) => booking.status === "confirmed").length,
    refused,
    incidents,
    affected: [...affected].sort(),
    byType,
    byCause,
  };
}

export type ChipKind = "confirmed" | "held" | "stale" | "expected";

export interface Chip {
  id: string;
  customer: string;
  kind: ChipKind;
  double: boolean;
  note: string | null;
}

/** What each schedule cell shows at a point in the replay. */
export function slotsAt(run: RunResult | null, index: number): Map<string, Chip[]> {
  const cells = new Map<string, Chip[]>();
  if (!run || index < 0) {
    return cells;
  }

  const now = run.events[index].t;
  const active = run.snapshots[index].filter((booking) => booking.status !== "released");

  const push = (key: string, chip: Chip) => {
    const list = cells.get(key) ?? [];
    list.push(chip);
    cells.set(key, list);
  };

  for (const booking of active) {
    const key = slotKey(booking.provider, booking.slot);
    const stale = booking.status === "held" && booking.holdExpiresAt !== null && booking.holdExpiresAt <= now;
    const misplaced = booking.slot !== booking.intendedSlot;
    push(key, {
      id: booking.id,
      customer: booking.customer,
      kind: stale ? "stale" : booking.status === "held" ? "held" : "confirmed",
      double: false,
      note: stale
        ? "expired"
        : misplaced
          ? `wanted ${formatSlot(booking.intendedSlot)}`
          : booking.status === "held"
            ? "paying"
            : booking.confirmations > 1
              ? `charged ×${booking.confirmations}`
              : null,
    });
    if (misplaced) {
      push(slotKey(booking.provider, booking.intendedSlot), {
        id: `${booking.id}-expected`,
        customer: booking.customer,
        kind: "expected",
        double: false,
        note: "expects this time",
      });
    }
  }

  for (const chips of cells.values()) {
    const real = chips.filter((chip) => chip.kind !== "expected");
    if (real.length > 1) {
      real.forEach((chip) => {
        chip.double = true;
      });
    }
  }

  return cells;
}

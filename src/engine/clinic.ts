import type { Clinic, GuardrailId, Guardrails, IncidentType } from "./types";

export const clinic: Clinic = {
  name: "Harbor Street Dental",
  city: "Karachi",
  timeZone: "Asia/Karachi",
  utcOffsetMin: 300,
  appointmentDay: "Thursday, 14 November",
  providers: [
    { id: "amin", name: "Dr. Amin" },
    { id: "rehman", name: "Dr. Rehman" },
  ],
  opensAt: 9 * 60,
  closesAt: 13 * 60,
  slotLength: 15,
};

/** Payment holds last ten minutes, like most hosted checkouts. */
export const HOLD_MS = 10 * 60 * 1000;

export const slotTimes: number[] = Array.from(
  { length: (clinic.closesAt - clinic.opensAt) / clinic.slotLength },
  (_, index) => clinic.opensAt + index * clinic.slotLength,
);

export function isValidSlot(minutes: number): boolean {
  return slotTimes.includes(minutes);
}

export function slotKey(provider: string, minutes: number): string {
  return `${provider}@${minutes}`;
}

export function providerName(id: string): string {
  return clinic.providers.find((provider) => provider.id === id)?.name ?? id;
}

export function formatSlot(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** Booking opens at 09:00:00 clinic time on the Monday before. */
export function formatClock(ms: number): string {
  const base = 9 * 3600 * 1000;
  const total = base + ms;
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = Math.floor(total % 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${String(millis).padStart(3, "0")}`;
}

export function formatOffset(offsetMin: number): string {
  if (offsetMin === 0) {
    return "UTC";
  }
  const sign = offsetMin > 0 ? "+" : "−";
  const hours = Math.floor(Math.abs(offsetMin) / 60);
  const mins = Math.abs(offsetMin) % 60;
  return `UTC${sign}${hours}${mins ? `:${pad(mins)}` : ""}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export interface GuardrailInfo {
  id: GuardrailId;
  name: string;
  summary: string;
  prevents: string;
  code: string;
}

export const guardrails: GuardrailInfo[] = [
  {
    id: "slot-lock",
    name: "Unique slot constraint",
    summary: "The database refuses a second active booking for the same slot.",
    prevents: "Two people confirmed for one chair",
    code: `create unique index one_active_booking
  on bookings (provider_id, starts_at)
  where status in ('held', 'confirmed');`,
  },
  {
    id: "hold-expiry",
    name: "Expire stale holds",
    summary: "Holds past their payment window are released before availability is checked.",
    prevents: "Open slots stuck behind abandoned checkouts",
    code: `update bookings set status = 'released'
  where provider_id = $1 and starts_at = $2
    and status = 'held' and hold_expires_at < now();`,
  },
  {
    id: "idempotency",
    name: "Idempotent webhooks",
    summary: "Each payment event ID is recorded once; repeats are acknowledged and skipped.",
    prevents: "Duplicate receipts and double charges",
    code: `insert into processed_events (event_id)
  values ($1)
  on conflict do nothing
  returning event_id; -- no row means: already handled`,
  },
  {
    id: "tz-normalize",
    name: "Explicit time zones",
    summary: "Submitted times are read as clinic wall-clock time in Asia/Karachi.",
    prevents: "Appointments shifted by the patient's own time zone",
    code: `const startsAt = DateTime
  .fromISO(input.localTime, { zone: "Asia/Karachi" })
  .toUTC();`,
  },
  {
    id: "waitlist-claim",
    name: "Waitlist handoff",
    summary: "A cancelled slot goes to the first waitlisted patient in the same transaction.",
    prevents: "The longest-waiting patient losing a freed slot to a faster tap",
    code: `with freed as (
  update bookings set status = 'cancelled'
  where id = $1 returning provider_id, starts_at
), next as (
  select w.id, w.patient_id from waitlist w, freed f
  where w.provider_id = f.provider_id and w.starts_at = f.starts_at
  order by w.joined_at limit 1
  for update skip locked
)
insert into bookings (provider_id, starts_at, patient_id, status)
select f.provider_id, f.starts_at, n.patient_id, 'confirmed'
from freed f, next n;`,
  },
];

export function guardrailInfo(id: GuardrailId): GuardrailInfo {
  const info = guardrails.find((guardrail) => guardrail.id === id);
  if (!info) {
    throw new Error(`Unknown guardrail: ${id}`);
  }
  return info;
}

export const allOff: Guardrails = {
  "slot-lock": false,
  "hold-expiry": false,
  idempotency: false,
  "tz-normalize": false,
  "waitlist-claim": false,
};

export const allOn: Guardrails = {
  "slot-lock": true,
  "hold-expiry": true,
  idempotency: true,
  "tz-normalize": true,
  "waitlist-claim": true,
};

export const incidentLabels: Record<IncidentType, { name: string; plural: string }> = {
  "double-booking": { name: "Double booking", plural: "Double bookings" },
  "turned-away": { name: "Turned away from an open slot", plural: "Turned away from open slots" },
  "charged-twice": { name: "Charged twice", plural: "Charged twice" },
  "wrong-time": { name: "Booked at the wrong time", plural: "Booked at the wrong time" },
  "passed-over": { name: "Passed over on the waitlist", plural: "Passed over on the waitlist" },
};

/** The offset suffix a browser puts on an ISO timestamp, e.g. "+04:00". */
export function isoOffset(offsetMin: number): string {
  const sign = offsetMin >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offsetMin) / 60);
  const mins = Math.abs(offsetMin) % 60;
  return `${sign}${pad(hours)}:${pad(mins)}`;
}

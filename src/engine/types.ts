export type GuardrailId =
  | "slot-lock"
  | "hold-expiry"
  | "idempotency"
  | "tz-normalize";

export type Guardrails = Record<GuardrailId, boolean>;

export type ScenarioId =
  | "race"
  | "expired-hold"
  | "duplicate-callback"
  | "timezone"
  | "rush-hour";

export type IncidentType =
  | "double-booking"
  | "turned-away"
  | "charged-twice"
  | "wrong-time";

export interface Provider {
  id: string;
  name: string;
}

export interface Clinic {
  name: string;
  city: string;
  timeZone: string;
  utcOffsetMin: number;
  appointmentDay: string;
  providers: Provider[];
  /** Minutes after local midnight. */
  opensAt: number;
  closesAt: number;
  slotLength: number;
}

export interface PaymentPlan {
  outcome: "paid" | "abandoned";
  /** Delay after the hold is written. */
  afterMs: number;
  /** Extra webhook deliveries, measured from the first one. */
  retriesMs?: number[];
}

export interface BookingRequest {
  id: string;
  customer: string;
  /** Milliseconds after booking opens. */
  at: number;
  provider: string;
  /** The slot the customer picked, in clinic minutes. */
  slot: number;
  clientOffsetMin?: number;
  clientCity?: string;
  readMs?: number;
  writeMs?: number;
  payment?: PaymentPlan;
}

export type BookingStatus = "held" | "confirmed" | "released";

export interface Booking {
  id: string;
  requestId: string;
  customer: string;
  provider: string;
  slot: number;
  intendedSlot: number;
  status: BookingStatus;
  holdExpiresAt: number | null;
  confirmations: number;
}

export interface Incident {
  type: IncidentType;
  cause: GuardrailId;
  customer: string;
}

export type Outcome = "info" | "ok" | "rejected" | "skipped" | "incident";

export interface SimEvent {
  index: number;
  t: number;
  actor: string;
  message: string;
  outcome: Outcome;
  slotKey: string | null;
  customer: string | null;
  incidents: Incident[];
}

export interface RunSummary {
  customers: number;
  confirmed: number;
  correctlyRefused: number;
  refunds: number;
  affectedCustomers: string[];
  byType: Record<IncidentType, number>;
  byCause: Record<GuardrailId, number>;
}

export interface RunResult {
  scenarioId: ScenarioId;
  seed: number;
  guardrails: Guardrails;
  requests: BookingRequest[];
  events: SimEvent[];
  /** Booking table after each event, aligned with `events`. */
  snapshots: Booking[][];
  summary: RunSummary;
}

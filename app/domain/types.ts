export type ScenarioId =
  | "race"
  | "expired-hold"
  | "duplicate-callback"
  | "timezone";

export type Severity = "critical" | "high" | "medium";

export type EventOutcome = "received" | "accepted" | "rejected" | "ignored";

export interface ScenarioDefinition {
  id: ScenarioId;
  category: string;
  title: string;
  description: string;
  risk: string;
  protection: string;
}

export interface SimulationEvent {
  order: number;
  time: string;
  actor: string;
  message: string;
  outcome: EventOutcome;
}

export interface ScenarioFinalState {
  confirmedBookings: number;
  rejectedRequests: number;
  cancelledHolds: number;
  ignoredCallbacks: number;
  summary: string;
}

export interface ScenarioReport {
  id: ScenarioId;
  title: string;
  severity: Severity;
  events: SimulationEvent[];
  finalState: ScenarioFinalState;
  reliabilityScore: number;
  recommendation: string;
}

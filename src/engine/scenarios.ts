import { slotTimes } from "./clinic";
import { createRandom } from "./random";
import type { BookingRequest, GuardrailId, ScenarioId } from "./types";

export interface Scenario {
  id: ScenarioId;
  title: string;
  summary: string;
  /** The guardrail this scenario is designed to exercise; rush hour exercises all. */
  focus: GuardrailId | null;
  seeded: boolean;
  build: (seed: number) => BookingRequest[];
}

const s = (hours: number, minutes: number) => hours * 60 + minutes;
const sec = 1000;
const min = 60 * sec;

export const scenarios: Scenario[] = [
  {
    id: "race",
    title: "Opening-minute race",
    summary:
      "Booking opens and three patients tap the same 10:00 slot within a few milliseconds.",
    focus: "slot-lock",
    seeded: false,
    build: () => [
      { id: "r1", customer: "Hamza S.", at: 0, provider: "amin", slot: s(10, 0), readMs: 4, writeMs: 9 },
      { id: "r2", customer: "Ayesha R.", at: 3, provider: "amin", slot: s(10, 0), readMs: 3, writeMs: 8 },
      { id: "r3", customer: "Bilal K.", at: 11, provider: "amin", slot: s(10, 0), readMs: 4, writeMs: 7 },
      { id: "r4", customer: "Zara M.", at: 20, provider: "rehman", slot: s(9, 30) },
      { id: "r5", customer: "Omar D.", at: 1_200, provider: "amin", slot: s(10, 15) },
    ],
  },
  {
    id: "expired-hold",
    title: "Abandoned checkout",
    summary:
      "A patient holds 11:30, closes the payment page, and the slot is never given back.",
    focus: "hold-expiry",
    seeded: false,
    build: () => [
      {
        id: "r1",
        customer: "Mariam J.",
        at: 0,
        provider: "amin",
        slot: s(11, 30),
        payment: { outcome: "abandoned", afterMs: 90 * sec },
      },
      {
        id: "r2",
        customer: "Usman T.",
        at: 2 * min + 10 * sec,
        provider: "rehman",
        slot: s(9, 45),
        payment: { outcome: "paid", afterMs: 40 * sec },
      },
      { id: "r3", customer: "Saad Q.", at: 14 * min + 5 * sec, provider: "amin", slot: s(11, 30) },
      { id: "r4", customer: "Hina A.", at: 16 * min + 30 * sec, provider: "amin", slot: s(11, 30) },
    ],
  },
  {
    id: "duplicate-callback",
    title: "Webhook retries",
    summary:
      "The payment provider never sees a 200 in time, so it delivers the same success event again.",
    focus: "idempotency",
    seeded: false,
    build: () => [
      {
        id: "r1",
        customer: "Noor F.",
        at: 0,
        provider: "rehman",
        slot: s(10, 30),
        payment: { outcome: "paid", afterMs: 35 * sec, retriesMs: [30 * sec, 90 * sec] },
      },
      {
        id: "r2",
        customer: "Ali H.",
        at: 5 * sec,
        provider: "amin",
        slot: s(9, 15),
        payment: { outcome: "paid", afterMs: 50 * sec, retriesMs: [30 * sec] },
      },
      { id: "r3", customer: "Sana I.", at: 60 * sec, provider: "amin", slot: s(12, 0) },
    ],
  },
  {
    id: "timezone",
    title: "Patients abroad",
    summary:
      "Patients in Dubai, London and Riyadh pick times shown in clinic time; their browsers send their own offset.",
    focus: "tz-normalize",
    seeded: false,
    build: () => [
      {
        id: "r1",
        customer: "Fatima N.",
        at: 0,
        provider: "amin",
        slot: s(10, 0),
        clientOffsetMin: 240,
        clientCity: "Dubai",
      },
      {
        id: "r2",
        customer: "Omar D.",
        at: 20 * sec,
        provider: "rehman",
        slot: s(10, 0),
        clientOffsetMin: 0,
        clientCity: "London",
      },
      { id: "r3", customer: "Kamran B.", at: 60 * sec, provider: "amin", slot: s(11, 0) },
      {
        id: "r4",
        customer: "Iqra L.",
        at: 2 * min,
        provider: "rehman",
        slot: s(12, 30),
        clientOffsetMin: 180,
        clientCity: "Riyadh",
      },
    ],
  },
  {
    id: "rush-hour",
    title: "Monday rush",
    summary:
      "Thirty patients over half an hour: bursts on popular slots, abandoned checkouts, retries and overseas bookings.",
    focus: null,
    seeded: true,
    build: buildRushHour,
  },
];

export function getScenario(id: ScenarioId): Scenario {
  const scenario = scenarios.find((candidate) => candidate.id === id);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${id}`);
  }
  return scenario;
}

const NAMES = [
  "Ayesha R.", "Bilal K.", "Hamza S.", "Zara M.", "Usman T.", "Fatima N.",
  "Omar D.", "Hina A.", "Saad Q.", "Mariam J.", "Ali H.", "Noor F.",
  "Danish P.", "Sana I.", "Kamran B.", "Iqra L.", "Farhan Y.", "Mehwish C.",
  "Taha W.", "Rabia G.", "Imran Z.", "Amna V.", "Junaid E.", "Laiba O.",
  "Yasir U.", "Hiba K.", "Faisal M.", "Sadia R.", "Adeel S.", "Komal T.",
];

const ABROAD = [
  { city: "Dubai", offset: 240 },
  { city: "London", offset: 0 },
  { city: "Riyadh", offset: 180 },
  { city: "Toronto", offset: -300 },
];

function buildRushHour(seed: number): BookingRequest[] {
  const random = createRandom(seed);
  const names = random.shuffle(NAMES);
  const providers = ["amin", "rehman"];
  const popular = [s(9, 0), s(9, 15), s(10, 0), s(12, 0), s(12, 15)];
  const requests: BookingRequest[] = [];
  const abandonedSlots: { provider: string; slot: number }[] = [];
  let at = 0;

  const add = (request: Omit<BookingRequest, "id" | "customer">) => {
    const index = requests.length;
    requests.push({ id: `r${index + 1}`, customer: names[index % names.length], ...request });
  };

  const extras = (): Pick<BookingRequest, "payment" | "clientOffsetMin" | "clientCity"> => {
    const result: Pick<BookingRequest, "payment" | "clientOffsetMin" | "clientCity"> = {};
    if (random.chance(0.6)) {
      const abandoned = random.chance(0.25);
      result.payment = abandoned
        ? { outcome: "abandoned", afterMs: random.int(30, 120) * sec }
        : {
            outcome: "paid",
            afterMs: random.int(20, 70) * sec,
            retriesMs: random.chance(0.45)
              ? random.chance(0.5)
                ? [30 * sec]
                : [30 * sec, 2 * min]
              : undefined,
          };
    }
    if (random.chance(0.15)) {
      const place = random.pick(ABROAD);
      result.clientOffsetMin = place.offset;
      result.clientCity = place.city;
    }
    return result;
  };

  // The opening burst: clusters of patients land on the same popular slot.
  for (let cluster = 0; cluster < 6; cluster += 1) {
    const provider = random.pick(providers);
    const slot = random.pick(popular);
    const size = random.int(1, 3);
    at += random.int(80, 900);
    for (let member = 0; member < size; member += 1) {
      const request = {
        at: at + member * random.int(1, 6),
        provider,
        slot,
        readMs: random.int(2, 6),
        writeMs: random.int(5, 12),
        ...extras(),
      };
      add(request);
      if (request.payment?.outcome === "abandoned") {
        abandonedSlots.push({ provider, slot });
      }
    }
  }

  // A steady trickle through the first few minutes.
  for (let index = 0; index < 8; index += 1) {
    at += random.int(8, 30) * sec;
    const request = {
      at,
      provider: random.pick(providers),
      slot: random.pick(slotTimes),
      ...extras(),
    };
    add(request);
    if (request.payment?.outcome === "abandoned") {
      abandonedSlots.push({ provider: request.provider, slot: request.slot });
    }
  }

  // Later in the half hour, some patients want slots that were only ever held.
  at = Math.max(at, 12 * min);
  while (requests.length < 30) {
    at += random.int(20, 70) * sec;
    const target = abandonedSlots.length > 0 && random.chance(0.7)
      ? random.pick(abandonedSlots)
      : { provider: random.pick(providers), slot: random.pick(slotTimes) };
    add({ at, ...target, ...extras() });
  }

  return requests;
}

import { clinic, formatOffset, formatSlot, slotKey, slotTimes } from "../engine/clinic";
import type { RunResult } from "../engine/types";
import { slotsAt, type Chip } from "./derive";

interface ScheduleProps {
  run: RunResult | null;
  index: number;
}

export function Schedule({ run, index }: ScheduleProps) {
  const cells = slotsAt(run, index);
  const current = run && index >= 0 ? run.events[index] : null;

  return (
    <section className="card" aria-labelledby="schedule-heading">
      <div className="schedule-head">
        <div>
          <h2 className="schedule-title" id="schedule-heading">{clinic.appointmentDay}</h2>
          <p className="muted" style={{ fontSize: 12 }}>
            {clinic.name}, {clinic.city} · clinic time {formatOffset(clinic.utcOffsetMin)}
          </p>
        </div>
        <div className="legend" aria-label="Legend">
          <span className="legend-item"><span className="swatch confirmed" />Booked</span>
          <span className="legend-item"><span className="swatch held" />Held for payment</span>
          <span className="legend-item"><span className="swatch stale" />Expired hold</span>
          <span className="legend-item"><span className="swatch double" />Double-booked</span>
        </div>
      </div>
      <div className="schedule-scroll">
        <div className="schedule" role="table" aria-label={`Appointments on ${clinic.appointmentDay}`}>
          <div role="row" style={{ display: "contents" }}>
            <span role="columnheader" className="schedule-colhead"><span className="visually-hidden">Time</span></span>
            {clinic.providers.map((provider) => (
              <span role="columnheader" className="schedule-colhead" key={provider.id}>{provider.name}</span>
            ))}
          </div>
          {slotTimes.map((minutes) => {
            const onHour = minutes % 60 === 0;
            return (
              <div role="row" style={{ display: "contents" }} key={minutes}>
                <span role="rowheader" className={`schedule-time mono${onHour ? " on-hour" : ""}`}>
                  {formatSlot(minutes)}
                </span>
                {clinic.providers.map((provider) => {
                  const key = slotKey(provider.id, minutes);
                  const chips = cells.get(key) ?? [];
                  const isCurrent = current?.slotKey === key;
                  return (
                    <div
                      role="cell"
                      key={key}
                      className={[
                        "slot",
                        onHour ? "on-hour" : "",
                        isCurrent ? "is-current" : "",
                        isCurrent && current?.outcome === "incident" ? "is-incident" : "",
                      ].join(" ")}
                    >
                      {chips.length === 0 ? (
                        <span className="visually-hidden">Open</span>
                      ) : (
                        chips.map((chip) => <SlotChip chip={chip} key={chip.id} />)
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const kindLabel: Record<Chip["kind"], string> = {
  confirmed: "booked",
  held: "held for payment",
  stale: "hold expired but still blocking",
  expected: "expected here",
};

function SlotChip({ chip }: { chip: Chip }) {
  return (
    <span
      className={`chip ${chip.kind}${chip.double ? " is-double" : ""}`}
      title={`${chip.customer}: ${kindLabel[chip.kind]}${chip.note ? ` (${chip.note})` : ""}`}
    >
      <span className="chip-name">{chip.customer}</span>
      {chip.note ? <span className="chip-note">{chip.note}</span> : null}
      <span className="visually-hidden">, {kindLabel[chip.kind]}{chip.double ? ", double-booked" : ""}</span>
    </span>
  );
}

import { useEffect, useRef } from "react";
import { formatClock } from "../engine/clinic";
import type { RunResult } from "../engine/types";

interface EventLogProps {
  run: RunResult | null;
  index: number;
  onSeek: (index: number) => void;
}

const outcomeText = {
  info: "",
  ok: "done",
  rejected: "refused correctly",
  skipped: "skipped",
  incident: "incident",
} as const;

export function EventLog({ run, index, onSeek }: EventLogProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!list || !row) {
      return;
    }
    const top = row.offsetTop - list.offsetTop;
    if (top < list.scrollTop + 8 || top + row.offsetHeight > list.scrollTop + list.clientHeight - 8) {
      list.scrollTo({ top: Math.max(0, top - list.clientHeight / 2), behavior: reducedMotion() ? "auto" : "smooth" });
    }
  }, [index]);

  return (
    <section className="card" aria-labelledby="log-heading">
      <div className="card-head">
        <h2 className="label" id="log-heading">Event log</h2>
        {run ? (
          <span className="faint" style={{ fontSize: 12 }}>
            Select a row to jump there
          </span>
        ) : null}
      </div>
      {run ? (
        <div className="log" ref={listRef}>
          {run.events.map((event) => {
            const state = event.index === index ? "is-current" : event.index > index ? "is-future" : "";
            return (
              <button
                type="button"
                key={event.index}
                data-index={event.index}
                className={`log-row ${state}${event.outcome === "incident" ? " is-incident" : ""}`}
                aria-current={event.index === index ? "step" : undefined}
                onClick={() => onSeek(event.index)}
              >
                <span className="log-time">{formatClock(event.t)}</span>
                <span className={`log-dot ${event.outcome}`} aria-hidden="true" />
                <span className="log-message">
                  <span className="log-actor">{event.actor}</span>
                  {event.message}
                  {event.outcome === "incident" ? <span className="pill danger">Incident</span> : null}
                  {event.outcome !== "incident" && outcomeText[event.outcome] ? (
                    <span className="visually-hidden"> ({outcomeText[event.outcome]})</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="log-empty">Each request, database write, and webhook will be listed here in order.</p>
      )}
    </section>
  );
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

import { formatClock } from "../engine/clinic";
import type { RunResult } from "../engine/types";
import { PauseIcon, PlayIcon, StepBackIcon, StepForwardIcon } from "../ui/icons";

interface ReplayProps {
  run: RunResult;
  index: number;
  playing: boolean;
  onToggle: () => void;
  onSeek: (index: number) => void;
}

export function Replay({ run, index, playing, onToggle, onSeek }: ReplayProps) {
  const last = run.events.length - 1;
  const position = (value: number) => (last <= 0 ? 0 : ((value + 1) / (last + 1)) * 100);
  const current = index >= 0 ? run.events[index] : null;

  return (
    <div className="card replay">
      <div className="replay-controls">
        <button
          type="button"
          className="icon-button"
          aria-label="Previous event"
          onClick={() => onSeek(index - 1)}
          disabled={index < 0}
        >
          <StepBackIcon />
        </button>
        <button
          type="button"
          className="icon-button primary"
          aria-label={playing ? "Pause replay" : "Play replay"}
          onClick={onToggle}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Next event"
          onClick={() => onSeek(index + 1)}
          disabled={index >= last}
        >
          <StepForwardIcon />
        </button>
      </div>

      <div className="scrubber">
        <div className="scrubber-track">
          <div className="scrubber-fill" style={{ width: `${index < 0 ? 0 : position(index)}%` }} />
        </div>
        {run.events.map((event) =>
          event.outcome === "incident" ? (
            <span
              key={event.index}
              className={`scrubber-tick${event.index <= index ? " passed" : ""}`}
              style={{ left: `${position(event.index)}%` }}
            />
          ) : null,
        )}
        <input
          type="range"
          min={-1}
          max={last}
          step={1}
          value={index}
          aria-label="Replay position"
          aria-valuetext={current ? `Event ${index + 1} of ${last + 1}: ${current.actor}, ${current.message}` : "Start"}
          onChange={(event) => onSeek(Number(event.target.value))}
        />
        <span className="scrubber-thumb" style={{ left: `${index < 0 ? 0 : position(index)}%` }} />
      </div>

      <div className="replay-clock" aria-live="off">
        <span className="mono">{current ? formatClock(current.t) : formatClock(0)}</span>
        <span>
          {index + 1} / {last + 1} events
        </span>
      </div>
    </div>
  );
}

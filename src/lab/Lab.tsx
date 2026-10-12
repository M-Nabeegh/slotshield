import { useCallback, useEffect, useRef, useState } from "react";
import { allOff, guardrails as guardrailList } from "../engine/clinic";
import { simulate, totalIncidents } from "../engine/engine";
import { getScenario } from "../engine/scenarios";
import type { GuardrailId, Guardrails, RunResult, ScenarioId } from "../engine/types";
import { PlayIcon, RestartIcon, ShuffleIcon } from "../ui/icons";
import { useToast } from "../ui/useToast";
import { EventLog } from "./EventLog";
import { GuardrailPanel } from "./GuardrailPanel";
import { OutcomePanel } from "./OutcomePanel";
import { Replay } from "./Replay";
import { reportMarkdown } from "./report";
import { RunHistory, type HistoryEntry } from "./RunHistory";
import { ScenarioPicker } from "./ScenarioPicker";
import { Schedule } from "./Schedule";
import { setupFromHash, setupToHash } from "./shareLink";
import { usePlayback } from "./usePlayback";

export const DEFAULT_SEED = 8;

interface Setup {
  scenarioId: ScenarioId;
  guardrails: Guardrails;
  seed: number;
}

export function Lab() {
  // A shared link opens straight into its run.
  const [shared] = useState(() => setupFromHash(window.location.hash, DEFAULT_SEED));
  const [setup, setSetup] = useState<Setup>(
    () => shared ?? { scenarioId: "race", guardrails: allOff, seed: DEFAULT_SEED },
  );
  const [run, setRun] = useState<RunResult | null>(() =>
    shared ? simulate(shared.scenarioId, shared.guardrails, shared.seed) : null,
  );
  const [runKey, setRunKey] = useState(shared ? 1 : 0);
  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    run ? [historyEntry(1, run)] : [],
  );
  const toast = useToast();
  const keyCounter = useRef(shared ? 1 : 0);

  const scenario = getScenario(setup.scenarioId);
  const sameTraffic = run !== null &&
    run.scenarioId === setup.scenarioId &&
    (!scenario.seeded || run.seed === setup.seed);
  const visibleRun = sameTraffic ? run : null;
  const stale = visibleRun !== null &&
    guardrailList.some((guardrail) => visibleRun.guardrails[guardrail.id] !== setup.guardrails[guardrail.id]);

  const playback = usePlayback(visibleRun?.events.length ?? 0, runKey);

  const execute = useCallback((next: Setup) => {
    const result = simulate(next.scenarioId, next.guardrails, next.seed);
    setSetup(next);
    setRun(result);
    const nextKey = ++keyCounter.current;
    setRunKey(nextKey);
    const entry = historyEntry(nextKey, result);
    window.history.replaceState(null, "", setupToHash(next));
    // Running the same setup twice replays it; it is not a new data point.
    setHistory((entries) => [
      entry,
      ...entries.filter((existing) => !sameSetup(existing, entry)),
    ].slice(0, 8));
  }, []);

  const runNow = useCallback(() => execute(setup), [execute, setup]);

  const fix = (id: GuardrailId) => {
    execute({ ...setup, guardrails: { ...setup.guardrails, [id]: true } });
  };

  const copyReport = async () => {
    if (!visibleRun) {
      return;
    }
    try {
      await navigator.clipboard.writeText(reportMarkdown(visibleRun));
      toast.show("Report copied as Markdown");
    } catch {
      toast.show("Copy failed: clipboard access was blocked");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split("#")[0] + setupToHash(setup));
      toast.show("Link to this setup copied");
    } catch {
      toast.show("Copy failed: clipboard access was blocked");
    }
  };

  const { index, playing, seek, toggle } = playback;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey || target?.closest("input, textarea, select")) {
        return;
      }
      // Space and Enter already activate focused controls; leave those alone.
      const onControl = Boolean(target?.closest("button, a, summary, [role='switch'], [role='radio']"));
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        runNow();
      } else if (event.key === " " && visibleRun && !onControl) {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowRight" && visibleRun) {
        event.preventDefault();
        seek(index + 1);
      } else if (event.key === "ArrowLeft" && visibleRun) {
        event.preventDefault();
        seek(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, runNow, seek, toggle, visibleRun]);

  return (
    <div className="lab">
      <div className="lab-column lab-setup">
        <ScenarioPicker
          value={setup.scenarioId}
          onChange={(scenarioId) => setSetup((current) => ({ ...current, scenarioId }))}
        />
        <GuardrailPanel
          value={setup.guardrails}
          focus={scenario.focus}
          onChange={(next) => setSetup((current) => ({ ...current, guardrails: next }))}
        />
      </div>

      <div className="lab-column">
        <div className="stage-head">
          <div>
            <h1 className="stage-title">{scenario.title}</h1>
            <p className="stage-summary">{scenario.summary}</p>
          </div>
          <div className="stage-actions">
            {scenario.seeded ? (
              <span className="seed">
                Traffic #{setup.seed}
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Generate different traffic"
                  title="Generate different traffic"
                  onClick={() =>
                    execute({ ...setup, seed: 1 + ((setup.seed * 7919 + 104729) % 9973) })
                  }
                >
                  <ShuffleIcon />
                </button>
              </span>
            ) : null}
            <button type="button" className="button primary" onClick={runNow}>
              {visibleRun ? <RestartIcon size={14} /> : <PlayIcon size={14} />}
              {visibleRun ? "Run again" : "Run"}
              <span className="kbd" aria-hidden="true">R</span>
            </button>
          </div>
        </div>

        {stale ? (
          <div className="stale-note" role="status">
            <span>Guardrails changed since this run. The schedule still shows the old result.</span>
            <button type="button" className="button small" onClick={runNow}>Run with new settings</button>
          </div>
        ) : null}

        <Schedule run={visibleRun} index={index} />
        {visibleRun ? (
          <Replay run={visibleRun} index={index} playing={playing} onToggle={toggle} onSeek={seek} />
        ) : null}
        <EventLog run={visibleRun} index={index} onSeek={seek} />
      </div>

      <div className="lab-column lab-outcome">
        <OutcomePanel
          run={visibleRun}
          index={index}
          stale={stale}
          guardrailsNow={setup.guardrails}
          onFix={fix}
          onCopy={copyReport}
          onCopyLink={copyLink}
        />
        <RunHistory
          entries={history}
          activeKey={visibleRun ? runKey : null}
          onRestore={(entry) =>
            execute({ scenarioId: entry.scenarioId, guardrails: entry.guardrails, seed: entry.seed })
          }
        />
      </div>

      {toast.message ? <div className="toast" role="status">{toast.message}</div> : null}
    </div>
  );
}

function sameSetup(a: HistoryEntry, b: HistoryEntry): boolean {
  return a.scenarioId === b.scenarioId &&
    (!getScenario(a.scenarioId).seeded || a.seed === b.seed) &&
    guardrailList.every((guardrail) => a.guardrails[guardrail.id] === b.guardrails[guardrail.id]);
}

function historyEntry(key: number, result: RunResult): HistoryEntry {
  return {
    key,
    scenarioId: result.scenarioId,
    seed: result.seed,
    guardrails: { ...result.guardrails },
    affected: result.summary.affectedCustomers.length,
    customers: result.summary.customers,
    incidents: totalIncidents(result.summary),
  };
}

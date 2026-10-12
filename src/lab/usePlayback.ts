import { useCallback, useEffect, useState } from "react";

/**
 * Steps through a run's events. A new `runKey` starts playback from the top.
 * Stepping changes content rather than moving it, so it also runs under
 * reduced motion; the CSS drops the transitions in that case.
 */
export function usePlayback(length: number, runKey: number) {
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  // Run keys start at 1, so a run that exists on first render still plays.
  const [trackedKey, setTrackedKey] = useState(0);

  if (trackedKey !== runKey) {
    setTrackedKey(runKey);
    setIndex(-1);
    setPlaying(length > 0);
  }

  const delay = Math.min(420, Math.max(70, Math.round(5600 / Math.max(length, 1))));

  // Playback stops by itself on the last event.
  const isPlaying = playing && index < length - 1;

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    const timer = setTimeout(() => setIndex((current) => current + 1), index < 0 ? 160 : delay);
    return () => clearTimeout(timer);
  }, [isPlaying, index, delay]);

  const seek = useCallback(
    (next: number) => {
      setPlaying(false);
      setIndex(Math.max(-1, Math.min(length - 1, next)));
    },
    [length],
  );

  const toggle = useCallback(() => {
    if (length === 0) {
      return;
    }
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    if (index >= length - 1) {
      setIndex(-1);
    }
    setPlaying(true);
  }, [index, isPlaying, length]);

  return { index, playing: isPlaying, seek, toggle };
}

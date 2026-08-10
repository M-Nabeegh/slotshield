"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "manual";

export function PublicAccessBar({ shareUrl }: { shareUrl: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  function showTemporaryState(state: CopyState) {
    setCopyState(state);
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setCopyState("idle");
      resetTimerRef.current = null;
    }, 2000);
  }

  async function copyShareLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showTemporaryState("copied");
        return;
      } catch {
        // Fall through to a visible manual-copy path.
      }
    }

    showTemporaryState("manual");
  }

  return (
    <div className="public-access-bar">
      <span className="public-access-status">PUBLIC PREVIEW</span>
      <span className="public-access-trust">No account required</span>
      <span className="public-access-url" title={shareUrl}>
        {shareUrl}
      </span>
      <button
        className="public-access-button"
        type="button"
        onClick={copyShareLink}
        aria-label={copyState === "copied" ? "Link copied" : "Copy share link"}
      >
        {copyState === "copied" ? "Link copied" : "Copy share link"}
      </button>
      {copyState === "manual" ? (
        <span className="public-access-fallback" role="status">
          Select and copy this link
        </span>
      ) : null}
    </div>
  );
}

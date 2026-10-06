"use client";

import { useEffect, useState } from "react";

/**
 * Current time, re-rendering every `intervalMs` while `active`.
 * Starts at 0 so prerendered HTML never bakes in a build-time clock.
 */
export function useNow(intervalMs: number, active = true) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    // Re-sync immediately when (re)activated, then tick.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, active]);
  return now;
}

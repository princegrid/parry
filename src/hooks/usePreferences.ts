"use client";

import { useCallback, useEffect, useState } from "react";

import { DEFAULT_FILTERS, type Filters } from "@/lib/client/filters";
import type { SortOrder } from "@/lib/roblox/types";

/** Persisted between visits. The ID search is deliberately not persisted. */
export interface Preferences {
  sort: SortOrder;
  hideFull: boolean;
  minPlayers: number | null;
  maxPlayers: number | null;
}

const STORAGE_KEY = "parry.preferences.v1";

export const DEFAULT_PREFERENCES: Preferences = {
  sort: "asc",
  hideFull: DEFAULT_FILTERS.hideFull,
  minPlayers: null,
  maxPlayers: null,
};

function validCount(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100
    ? value
    : null;
}

function read(): Preferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      sort: parsed.sort === "desc" ? "desc" : "asc",
      hideFull: typeof parsed.hideFull === "boolean" ? parsed.hideFull : DEFAULT_PREFERENCES.hideFull,
      minPlayers: validCount(parsed.minPlayers),
      maxPlayers: validCount(parsed.maxPlayers),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Preferences load after mount (localStorage is browser-only), so `ready`
 * gates the first network request until the stored sort is known.
 */
export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Syncing from an external store on mount; one extra render is intended.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(read());
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable (private mode, quota): preferences just won't persist.
      }
      return next;
    });
  }, []);

  return { prefs, update, ready };
}

export function filtersFrom(prefs: Preferences, query: string): Filters {
  return {
    hideFull: prefs.hideFull,
    minPlayers: prefs.minPlayers,
    maxPlayers: prefs.maxPlayers,
    query,
  };
}

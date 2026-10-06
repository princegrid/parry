"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { fetchServerPage, type FetchError } from "@/lib/client/api";
import type { ServerInstance, ServerPage, SortOrder } from "@/lib/roblox/types";

export type RequestKind = "reset" | "more";

export type ChangedField = "playing";

/**
 * Fields that moved since the previous snapshot of the same instance. Only the player
 * count is flagged: ping and FPS jitter on nearly every refresh, so flagging them would
 * light up the whole list and mean nothing.
 */
function diff(before: ServerInstance, after: ServerInstance): ChangedField[] {
  return before.playing !== after.playing ? ["playing"] : [];
}

function changesBetween(previous: ServerInstance[], next: ServerInstance[]) {
  const byId = new Map(previous.map((s) => [s.id, s]));
  const changed: Record<string, ChangedField[]> = {};
  for (const server of next) {
    const before = byId.get(server.id);
    if (!before) continue;
    const fields = diff(before, server);
    if (fields.length) changed[server.id] = fields;
  }
  return changed;
}

export interface BrowserState {
  /** Unique servers across loaded pages, in arrival order. */
  servers: ServerInstance[];
  /** Upstream sort of the loaded pages (`null` before the first success). */
  loadedSort: SortOrder | null;
  cursor: string | null;
  pagesLoaded: number;
  /** Time the newest page was fetched from Roblox. */
  fetchedAt: string | null;
  pending: { kind: RequestKind; sort: SortOrder } | null;
  error: (FetchError & { during: RequestKind }) | null;
  /** Epoch ms until which requests are paused after a rate limit. */
  cooldownUntil: number;
  selectedId: string | null;
  /** Selected instance that was missing from the latest refresh. */
  missingId: string | null;
  /** Result of the most recent Load more, for the status line. */
  lastPage: { added: number; repeated: number } | null;
  /** The latest response was a saved copy served while Roblox was rate-limiting. */
  stale: boolean;
  /** Per instance, the values that changed in the latest response. */
  changed: Record<string, ChangedField[]>;
  /** Increments with each response so the change highlight can replay. */
  snapshot: number;
  /** The loaded list stops at the last stored snapshot page although Roblox had more. */
  truncated: boolean;
  /** The latest refresh returned data from the same fetch time as before. */
  unchanged: { at: number } | null;
}

type Action =
  | { type: "start"; kind: RequestKind; sort: SortOrder }
  | { type: "success"; kind: RequestKind; page: ServerPage }
  | { type: "failure"; kind: RequestKind; error: FetchError }
  | { type: "aborted" }
  | { type: "select"; id: string | null }
  | { type: "dismissMissing" }
  | { type: "dismissError" }
  | { type: "cooldownOver" };

const initialState: BrowserState = {
  servers: [],
  loadedSort: null,
  cursor: null,
  pagesLoaded: 0,
  fetchedAt: null,
  pending: null,
  error: null,
  cooldownUntil: 0,
  selectedId: null,
  missingId: null,
  lastPage: null,
  stale: false,
  changed: {},
  snapshot: 0,
  truncated: false,
  unchanged: null,
};

function reducer(state: BrowserState, action: Action): BrowserState {
  switch (action.type) {
    case "start":
      return { ...state, pending: { kind: action.kind, sort: action.sort }, error: null };

    case "success": {
      const { page } = action;
      const stale = page.cache === "stale";
      const cooldownUntil = stale
        ? Date.now() + (page.retryAfter ?? 60) * 1000
        : state.cooldownUntil;
      if (action.kind === "reset") {
        const stillThere = state.selectedId
          ? page.servers.some((s) => s.id === state.selectedId)
          : true;
        return {
          ...state,
          servers: page.servers,
          loadedSort: page.sort,
          cursor: page.nextCursor,
          pagesLoaded: 1,
          fetchedAt: page.fetchedAt,
          pending: null,
          error: null,
          selectedId: stillThere ? state.selectedId : null,
          missingId: stillThere ? null : state.selectedId,
          lastPage: null,
          stale,
          cooldownUntil,
          // A different sort is a different list, not a change in values.
          changed: state.loadedSort === page.sort ? changesBetween(state.servers, page.servers) : {},
          snapshot: state.snapshot + 1,
          truncated: !!page.truncated,
          unchanged:
            state.loadedSort === page.sort && state.fetchedAt === page.fetchedAt
              ? { at: Date.now() }
              : null,
        };
      }
      // Load more: refresh values of instances we already have, append the rest.
      const index = new Map(state.servers.map((s, i) => [s.id, i]));
      const merged = state.servers.slice();
      let added = 0;
      let repeated = 0;
      for (const server of page.servers) {
        const at = index.get(server.id);
        if (at === undefined) {
          index.set(server.id, merged.length);
          merged.push(server);
          added++;
        } else {
          merged[at] = server;
          repeated++;
        }
      }
      return {
        ...state,
        servers: merged,
        cursor: page.nextCursor,
        pagesLoaded: state.pagesLoaded + 1,
        fetchedAt: page.fetchedAt,
        pending: null,
        error: null,
        lastPage: { added, repeated },
        stale,
        cooldownUntil,
        changed: changesBetween(state.servers, page.servers),
        snapshot: state.snapshot + 1,
        truncated: !!page.truncated,
      };
    }

    case "failure": {
      const cooldownUntil =
        action.error.kind === "rate_limited"
          ? Date.now() + (action.error.retryAfter ?? 60) * 1000
          : state.cooldownUntil;
      // An expired cursor cannot be retried; drop it so Load more stops offering it.
      const cursor = action.error.kind === "cursor_invalid" ? null : state.cursor;
      return {
        ...state,
        pending: null,
        error: { ...action.error, during: action.kind },
        cooldownUntil,
        cursor,
      };
    }

    case "aborted":
      return { ...state, pending: null };

    case "select":
      return { ...state, selectedId: action.id, missingId: null };

    case "dismissMissing":
      return { ...state, missingId: null };

    case "dismissError":
      return { ...state, error: null };

    case "cooldownOver":
      return { ...state, cooldownUntil: 0 };
  }
}

/**
 * Owns all network state for the browser. Only one request runs at a time:
 * a newer reset aborts an older request, and late responses are ignored.
 */
export function useServerBrowser() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const run = useCallback(async (kind: RequestKind, sort: SortOrder, cursor: string | null) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    dispatch({ type: "start", kind, sort });
    const result = await fetchServerPage(sort, cursor, controller.signal);
    if (requestId !== requestIdRef.current) return; // superseded

    controllerRef.current = null;
    if (result.ok) dispatch({ type: "success", kind, page: result.page });
    else if ("aborted" in result) dispatch({ type: "aborted" });
    else dispatch({ type: "failure", kind, error: result.error });
  }, []);

  /** Starts over from the first page in `sort`. Cancels any request in flight. */
  const refresh = useCallback(
    (sort: SortOrder) => {
      if (Date.now() < stateRef.current.cooldownUntil) return false;
      void run("reset", sort, null);
      return true;
    },
    [run],
  );

  /** Appends the next page of the loaded sort. Ignored while anything is pending. */
  const loadMore = useCallback(() => {
    const s = stateRef.current;
    if (s.pending || !s.cursor || !s.loadedSort || Date.now() < s.cooldownUntil) return false;
    void run("more", s.loadedSort, s.cursor);
    return true;
  }, [run]);

  // Clear the cooldown flag when it lapses so controls re-enable on time.
  useEffect(() => {
    if (!state.cooldownUntil) return;
    const remaining = state.cooldownUntil - Date.now();
    const timer = window.setTimeout(() => dispatch({ type: "cooldownOver" }), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [state.cooldownUntil]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const select = useCallback((id: string | null) => dispatch({ type: "select", id }), []);
  const dismissMissing = useCallback(() => dispatch({ type: "dismissMissing" }), []);
  const dismissError = useCallback(() => dispatch({ type: "dismissError" }), []);

  return { state, refresh, loadMore, select, dismissMissing, dismissError };
}

"use client";

import {
  ArrowClockwise,
  CloudSlash,
  FunnelSimple,
  Hourglass,
  MagnifyingGlassMinus,
  Question,
  WarningCircle,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useNow } from "@/hooks/useNow";
import { filtersFrom, usePreferences } from "@/hooks/usePreferences";
import { useServerBrowser, type BrowserState } from "@/hooks/useServerBrowser";
import { copyText } from "@/lib/client/clipboard";
import { DATA_SOURCE, SNAPSHOT_STALE_MS } from "@/lib/client/source";
import {
  DEFAULT_FILTERS,
  applyFilters,
  filtersActive,
  orderServers,
  type Filters,
} from "@/lib/client/filters";
import { formatClock, formatCount } from "@/lib/client/format";
import { appJoinUri, shortId, webJoinUrl } from "@/lib/roblox/links";
import type { ServerInstance, SortOrder } from "@/lib/roblox/types";

import { AppHeader } from "./AppHeader";
import styles from "./browser.module.css";
import { ServerTable, SkeletonRows } from "./ServerTable";
import { Notice, StateMessage } from "./StateMessage";
import { StatusBar } from "./StatusBar";
import { Toolbar } from "./Toolbar";

type ErrorInfo = { title: string; text: string; icon: React.ReactNode };

function describeError(error: NonNullable<BrowserState["error"]>, cooldownMs: number): ErrorInfo {
  switch (error.kind) {
    case "rate_limited":
      return cooldownMs > 0
        ? {
            icon: <Hourglass size={18} weight="bold" />,
            title: "Roblox is rate-limiting the server list",
            text: "Refresh unlocks when the countdown on the Refresh button ends.",
          }
        : {
            icon: <ArrowClockwise size={18} weight="bold" />,
            title: "The rate limit has cleared",
            text: "You can refresh now.",
          };
    case "network":
      return {
        icon: <CloudSlash size={18} weight="bold" />,
        title: "Couldn't reach the server list",
        text: `${error.message} Check your connection, then try again.`,
      };
    case "timeout":
      return {
        icon: <Hourglass size={18} weight="bold" />,
        title: "Roblox took too long to answer",
        text: "This is usually brief. Try again in a moment.",
      };
    case "cursor_invalid":
      return {
        icon: <WarningCircle size={18} weight="bold" />,
        title: "That page of results expired",
        text: "Roblox page links only last a short time. Refresh to start again from the first page.",
      };
    case "shape":
      return {
        icon: <Question size={18} weight="bold" />,
        title: "Roblox sent something unexpected",
        text: "The response had no readable server list. Try again; if it keeps happening, the API may have changed.",
      };
    case "upstream":
    case "bad_request":
      return {
        icon: <WarningCircle size={18} weight="bold" />,
        title: "Roblox returned an error",
        text: `${error.message} Try again in a moment.`,
      };
  }
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function ServerBrowser() {
  const { state, refresh, loadMore, select, dismissMissing, dismissError } = useServerBrowser();
  const { prefs, update: updatePrefs, ready } = usePreferences();
  const [query, setQuery] = useState("");
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [mobileJoin, setMobileJoin] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const toast = useToast();

  // The sticky column header sits under the sticky toolbar, whose height can wrap.
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setToolbarHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cooldownActive = state.cooldownUntil > 0;
  const now = useNow(cooldownActive ? 1000 : 15_000);
  const cooldownMs = Math.max(0, state.cooldownUntil - now);

  const filters = useMemo<Filters>(() => filtersFrom(prefs, query), [prefs, query]);
  const hasData = state.fetchedAt !== null;
  const refreshing = state.pending?.kind === "reset";
  const loadingMore = state.pending?.kind === "more";

  // First load, once the stored sort is known. No polling after this.
  const started = useRef(false);
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    refresh(prefs.sort);
  }, [ready, prefs.sort, refresh]);

  // Phones and tablets get the https link, which hands off to the app or the store.
  useEffect(() => {
    const touchOs = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileJoin(touchOs);
  }, []);

  const ordered = useMemo(
    () => orderServers(state.servers, state.loadedSort ?? prefs.sort),
    [state.servers, state.loadedSort, prefs.sort],
  );
  const visible = useMemo(() => applyFilters(ordered, filters), [ordered, filters]);

  const capacity = useMemo(
    () => state.servers.reduce((max, s) => Math.max(max, s.maxPlayers ?? 0), 0) || 100,
    [state.servers],
  );

  const onRefresh = useCallback(() => {
    refresh(prefs.sort);
  }, [refresh, prefs.sort]);

  const onSortChange = useCallback(
    (sort: SortOrder) => {
      updatePrefs({ sort });
      refresh(sort);
    },
    [refresh, updatePrefs],
  );

  const onFiltersChange = useCallback(
    (patch: Partial<Filters>) => {
      const { query: nextQuery, hideFull, minPlayers, maxPlayers } = patch;
      if (nextQuery !== undefined) setQuery(nextQuery);
      const prefPatch = Object.fromEntries(
        Object.entries({ hideFull, minPlayers, maxPlayers }).filter(([, v]) => v !== undefined),
      );
      if (Object.keys(prefPatch).length) updatePrefs(prefPatch);
    },
    [updatePrefs],
  );

  const onResetFilters = useCallback(() => {
    setQuery("");
    updatePrefs({
      hideFull: DEFAULT_FILTERS.hideFull,
      minPlayers: DEFAULT_FILTERS.minPlayers,
      maxPlayers: DEFAULT_FILTERS.maxPlayers,
    });
  }, [updatePrefs]);

  const copy = useCallback(
    async (server: ServerInstance, what: "link" | "id") => {
      const text = what === "link" ? webJoinUrl(server.id) : server.id;
      const ok = await copyText(text);
      if (ok) {
        toast({
          tone: "success",
          message: what === "link" ? "Join link copied" : "Instance ID copied",
          detail: shortId(server.id),
        });
      } else {
        select(server.id);
        toast({
          tone: "error",
          message: "Couldn't copy to the clipboard",
          detail: "Your browser blocked it. The full value is shown under the selected server.",
          duration: 6000,
        });
      }
    },
    [select, toast],
  );

  const onCopyLink = useCallback((server: ServerInstance) => void copy(server, "link"), [copy]);
  const onCopyId = useCallback((server: ServerInstance) => void copy(server, "id"), [copy]);

  const onJoin = useCallback(
    (server: ServerInstance) => {
      select(server.id);
      setLaunchingId(server.id);
      window.setTimeout(() => setLaunchingId((id) => (id === server.id ? null : id)), 2500);
      toast({
        tone: "info",
        message: mobileJoin ? "Opened the Roblox join page" : "Asked your browser to open Roblox",
        detail: mobileJoin
          ? `Continue there to join ${shortId(server.id)}. The server may have filled since the last refresh.`
          : `Joining ${shortId(server.id)} if it still has room. Nothing opened? Roblox may not be installed.`,
        action: { label: "Copy link", onClick: () => void copy(server, "link") },
        duration: 8000,
      });
    },
    [copy, mobileJoin, select, toast],
  );

  const joinHref = useCallback(
    (id: string) => (mobileJoin ? webJoinUrl(id) : appJoinUri(id)),
    [mobileJoin],
  );

  // Snapshot mode: say so when Refresh found nothing newer than what is on screen.
  const unchanged = state.unchanged;
  useEffect(() => {
    if (!unchanged) return;
    toast({
      tone: "info",
      message: "No newer snapshot yet",
      detail: "A new one is published about once a minute. Try again shortly.",
    });
  }, [unchanged, toast]);

  // Feedback after Load more: how many were new versus already listed.
  const lastPage = state.lastPage;
  useEffect(() => {
    if (!lastPage) return;
    toast({
      tone: "info",
      message:
        lastPage.added === 0
          ? "No new servers on that page"
          : `Loaded ${formatCount(lastPage.added)} more ${lastPage.added === 1 ? "server" : "servers"}`,
      detail: lastPage.repeated
        ? `${lastPage.repeated} were already listed and have been updated.`
        : undefined,
    });
  }, [lastPage, toast]);

  // Keyboard: "/" focuses search, "r" refreshes. Ignored while typing or with modifiers.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        onRefresh();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRefresh]);

  const retry = useCallback(() => {
    const error = state.error;
    if (error?.during === "more" && error.kind !== "cursor_invalid" && state.cursor) loadMore();
    else refresh(state.loadedSort && error?.during === "more" ? state.loadedSort : prefs.sort);
  }, [state.error, state.cursor, state.loadedSort, loadMore, refresh, prefs.sort]);

  /* ---------- what goes in the table body ---------- */

  const errorInfo = state.error ? describeError(state.error, cooldownMs) : null;
  // While a cooldown runs, the countdown lives on the header's Refresh button only.
  const retryAction = state.error && cooldownMs <= 0 && (
    <Button
      variant="secondary"
      size="sm"
      onClick={retry}
      icon={<ArrowClockwise size={13} weight="bold" aria-hidden />}
    >
      {state.error.kind === "cursor_invalid" ? (
        "Refresh"
      ) : (
        "Try again"
      )}
    </Button>
  );

  let placeholder: React.ReactNode = null;
  if (!hasData) {
    if (errorInfo && !state.pending) {
      placeholder = (
        <StateMessage
          icon={errorInfo.icon}
          title={errorInfo.title}
          tone={state.error?.kind === "rate_limited" ? "warn" : "danger"}
          actions={retryAction}
        >
          {errorInfo.text}
        </StateMessage>
      );
    } else {
      placeholder = (
        <>
          <span className="srOnly" role="status">
            Loading servers
          </span>
          <SkeletonRows />
        </>
      );
    }
  } else if (state.servers.length === 0) {
    placeholder = (
      <StateMessage
        icon={<MagnifyingGlassMinus size={18} weight="bold" />}
        title="No public servers right now"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={cooldownMs > 0 || refreshing}
            busy={refreshing}
          >
            Refresh
          </Button>
        }
      >
        Roblox returned an empty list for the trading place. That can happen briefly; refresh to check again.
      </StateMessage>
    );
  } else if (visible.length === 0) {
    placeholder = (
      <StateMessage
        icon={<FunnelSimple size={18} weight="bold" />}
        title="No loaded servers match"
        actions={
          <>
            {filtersActive(filters) && (
              <Button variant="secondary" size="sm" onClick={onResetFilters}>
                Reset filters
              </Button>
            )}
          </>
        }
      >
        Filters only search the {formatCount(state.servers.length)} servers loaded so far
        {state.cursor ? ". Loading more pages from the bar below may find a match." : "."}
      </StateMessage>
    );
  }

  const missing = state.missingId;

  return (
    <div className={styles.shell}>
      <AppHeader
        fetchedAt={state.fetchedAt}
        now={now}
        refreshing={refreshing}
        cooldownMs={cooldownMs}
        disabled={!ready}
        onRefresh={onRefresh}
      />

      <main
        className={styles.panel}
        data-busy={refreshing || undefined}
        style={{ "--toolbar-h": `${toolbarHeight}px` } as React.CSSProperties}
      >
        <div ref={toolbarRef} className={styles.toolbarSticky}>
          <Toolbar
          sort={prefs.sort}
          onSortChange={onSortChange}
          sortDisabled={cooldownMs > 0}
          filters={filters}
          onFiltersChange={onFiltersChange}
          canReset={filtersActive(filters)}
          onReset={onResetFilters}
          searchRef={searchRef}
          capacity={capacity}
          />
        </div>

        {hasData && errorInfo && (
          <Notice
            icon={errorInfo.icon}
            tone={state.error?.kind === "rate_limited" ? "warn" : "danger"}
            actions={
              <>
                {retryAction}
                <Button variant="ghost" size="sm" onClick={dismissError}>
                  Dismiss
                </Button>
              </>
            }
          >
            <strong>{errorInfo.title}.</strong> {errorInfo.text} The list below is from the last successful load.
          </Notice>
        )}

        {hasData && state.stale && !errorInfo && (
          <Notice icon={<Hourglass size={16} weight="bold" />} tone="warn">
            <strong>Roblox is rate-limiting new requests.</strong> Showing the most recent saved copy, from{" "}
            <span className="num">{formatClock(state.fetchedAt!)}</span>.{" "}
            {cooldownMs > 0
              ? "Refresh unlocks when the countdown on the Refresh button ends."
              : "You can refresh now."}
          </Notice>
        )}

        {DATA_SOURCE === "snapshot" &&
          hasData &&
          now > 0 &&
          now - Date.parse(state.fetchedAt!) > SNAPSHOT_STALE_MS && (
            <Notice icon={<Hourglass size={16} weight="bold" />} tone="warn">
              <strong>This snapshot is from {formatClock(state.fetchedAt!)}.</strong> Updates normally arrive
              about once a minute, so the update job may be delayed. Counts may have changed since.
            </Notice>
          )}

        {missing && (
          <Notice
            icon={<Question size={16} weight="bold" />}
            actions={
              <Button variant="ghost" size="sm" onClick={dismissMissing}>
                Dismiss
              </Button>
            }
          >
            Instance <span className="mono">{shortId(missing)}</span> isn&apos;t in the refreshed list. It may have
            closed or filled up, or it is on a page that isn&apos;t loaded.
          </Notice>
        )}

        <ServerTable
          servers={visible}
          changed={state.changed}
          snapshot={state.snapshot}
          selectedId={state.selectedId}
          launchingId={launchingId}
          refreshing={refreshing && hasData}
          placeholder={placeholder}
          onSelect={select}
          onJoin={onJoin}
          onCopyLink={onCopyLink}
          onCopyId={onCopyId}
          joinHref={joinHref}
          joinTarget={mobileJoin ? "_blank" : "_self"}
        />

        <StatusBar
          ready={hasData}
          loading={!!state.pending || !ready}
          truncated={state.truncated}
          loaded={state.servers.length}
          shown={visible.length}
          pages={state.pagesLoaded}
          hasMore={!!state.cursor}
          loadingMore={loadingMore}
          loadMoreDisabled={!!state.pending || cooldownMs > 0}
          onLoadMore={loadMore}
        />
      </main>
    </div>
  );
}

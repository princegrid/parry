"use client";

import { CaretDoubleDown } from "@phosphor-icons/react";

import { Button } from "@/components/ui/Button";
import { Hint } from "@/components/ui/Hint";
import { Kbd } from "@/components/ui/Kbd";
import { formatCount } from "@/lib/client/format";
import { DATA_SOURCE } from "@/lib/client/source";

import styles from "./browser.module.css";

interface StatusBarProps {
  loaded: number;
  shown: number;
  pages: number;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreDisabled: boolean;
  onLoadMore: () => void;
  ready: boolean;
  /** A first-page request is in flight. */
  loading: boolean;
  /** Snapshot mode: the stored pages end before Roblox's list does. */
  truncated: boolean;
}

export function StatusBar({
  loaded,
  shown,
  pages,
  hasMore,
  loadingMore,
  loadMoreDisabled,
  onLoadMore,
  ready,
  loading,
  truncated,
}: StatusBarProps) {
  const snapshotMode = DATA_SOURCE === "snapshot";
  return (
    <footer className={styles.status}>
      <div className={styles.statusCounts} aria-live="polite" aria-atomic="true">
        {ready ? (
          <>
            <p className={styles.statusLine}>
              <span className={`${styles.statusStrong} num`}>{formatCount(shown)}</span> shown of{" "}
              <span className={`${styles.statusStrong} num`}>{formatCount(loaded)}</span> loaded
              <span className={`${styles.statusMuted} ${styles.pageInfo}`}>
                {" "}
                in {pages} {pages === 1 ? "page" : "pages"}
                {hasMore
                  ? ", more available"
                  : truncated
                    ? ", the snapshot stores no further pages"
                    : ", end of list"}
              </span>
            </p>
            <p className={styles.statusNote}>
              <span className={styles.noteLong}>
                {snapshotMode
                  ? "Snapshot published about once a minute, not every live server. Counts change constantly."
                  : "Snapshot of the loaded pages, not every live server. Counts change constantly."}
              </span>
              <span className={styles.noteShort}>
                <Hint label="About ping" placement="top-start">
                  Ping is reported by the Roblox API for each server. It is not a measurement of your own
                  connection.
                </Hint>
                Snapshot of loaded pages. Counts change.
              </span>
            </p>
          </>
        ) : (
          <p className={styles.statusLine}>
            <span className={styles.statusMuted}>
              {loading
                ? snapshotMode
                  ? "Fetching the latest snapshot"
                  : "Fetching the first page from Roblox"
                : "No servers loaded"}
            </span>
          </p>
        )}
      </div>

      <div className={styles.statusSide}>
        <p className={styles.shortcuts} aria-hidden>
          <Kbd>/</Kbd> search <Kbd>R</Kbd> refresh
        </p>
        {hasMore || loadingMore ? (
          <Button
            variant="secondary"
            onClick={onLoadMore}
            disabled={loadMoreDisabled}
            busy={loadingMore}
            icon={<CaretDoubleDown size={14} weight="bold" aria-hidden />}
          >
            {loadingMore ? "Loading" : "Load more"}
          </Button>
        ) : ready ? (
          <span className={styles.endTag}>All pages loaded</span>
        ) : null}
      </div>
    </footer>
  );
}

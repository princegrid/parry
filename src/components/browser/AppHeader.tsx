"use client";

import { ArrowClockwise } from "@phosphor-icons/react";

import { Button } from "@/components/ui/Button";
import { formatAge, formatClock, formatCountdown } from "@/lib/client/format";
import { TRADING_PLACE_ID } from "@/lib/roblox/constants";

import styles from "./browser.module.css";
import { Mark } from "./Mark";

interface AppHeaderProps {
  fetchedAt: string | null;
  now: number;
  refreshing: boolean;
  cooldownMs: number;
  disabled: boolean;
  onRefresh: () => void;
}

export function AppHeader({ fetchedAt, now, refreshing, cooldownMs, disabled, onRefresh }: AppHeaderProps) {
  const cooling = cooldownMs > 0;
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Mark size={26} />
        <div className={styles.brandText}>
          <h1 className={styles.productName}>Parry</h1>
          <p className={styles.productSub} title={`Roblox place ${TRADING_PLACE_ID}`}>
            Blade Ball trading servers
          </p>
        </div>
      </div>

      <div className={styles.headerSide}>
        <p className={styles.updated} aria-live="off">
          {fetchedAt ? (
            <>
              <span className={styles.updatedLabel}>Updated </span>
              <time dateTime={fetchedAt} className="num">
                {formatClock(fetchedAt)}
              </time>
              <span className={styles.updatedAge}> ({formatAge(fetchedAt, now)})</span>
            </>
          ) : (
            <span className={styles.updatedLabel}>Not loaded yet</span>
          )}
        </p>
        <Button
          variant="secondary"
          onClick={onRefresh}
          disabled={disabled || cooling}
          busy={refreshing}
          icon={<ArrowClockwise size={15} weight="bold" aria-hidden />}
          aria-keyshortcuts="r"
          className={styles.refreshButton}
        >
          {refreshing ? (fetchedAt ? "Refreshing" : "Loading") : cooling ? (
            <span>
              Retry in <span className="num">{formatCountdown(cooldownMs)}</span>
            </span>
          ) : (
            "Refresh"
          )}
        </Button>
      </div>
    </header>
  );
}

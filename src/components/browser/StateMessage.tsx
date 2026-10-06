import type { ReactNode } from "react";

import styles from "./browser.module.css";

/** Centered state inside the table body: empty, no matches, or a failure with no data. */
export function StateMessage({
  icon,
  title,
  children,
  actions,
  tone = "neutral",
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: "neutral" | "warn" | "danger";
}) {
  return (
    <div className={styles.state} data-tone={tone} role={tone === "neutral" ? undefined : "alert"}>
      <h2 className={styles.stateTitle}>
        <span className={styles.stateIcon} aria-hidden>
          {icon}
        </span>
        {title}
      </h2>
      {children && <p className={styles.stateText}>{children}</p>}
      {actions && <div className={styles.stateActions}>{actions}</div>}
    </div>
  );
}

/** Inline banner above the table, used when there are still results to show. */
export function Notice({
  icon,
  children,
  actions,
  tone = "neutral",
}: {
  icon: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  tone?: "neutral" | "warn" | "danger";
}) {
  return (
    <div className={styles.notice} data-tone={tone} role={tone === "neutral" ? "status" : "alert"}>
      <span className={styles.noticeIcon}>{icon}</span>
      <p className={styles.noticeText}>{children}</p>
      {actions && <div className={styles.noticeActions}>{actions}</div>}
    </div>
  );
}

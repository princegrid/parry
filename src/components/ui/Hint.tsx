"use client";

import { Info } from "@phosphor-icons/react";
import { useId, useState, type ReactNode } from "react";

import styles from "./ui.module.css";

/**
 * Small info button that reveals an explanation on hover, focus or tap.
 * The text is always in the DOM and linked with aria-describedby.
 */
export function Hint({
  label,
  children,
  placement = "bottom",
}: {
  label: string;
  children: ReactNode;
  /** `top-start` opens upward from the trigger's left edge: for triggers near the bottom-left. */
  placement?: "bottom" | "top-start";
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className={styles.hint}
      data-open={open || undefined}
      data-placement={placement}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={styles.hintTrigger}
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        <Info size={13} weight="bold" aria-hidden />
      </button>
      <span role="tooltip" id={id} className={styles.hintBubble}>
        {children}
      </span>
    </span>
  );
}

"use client";

import { Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import { forwardRef, useEffect, useState, type InputHTMLAttributes } from "react";

import styles from "./ui.module.css";

/** Checkbox styled as a compact chip with a check mark. */
export function CheckChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.checkChip}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.checkInput}
      />
      <span className={styles.checkBox} aria-hidden>
        <Check size={11} weight="bold" />
      </span>
      {label}
    </label>
  );
}

interface CountFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  invalid?: boolean;
  describedBy?: string;
  max: number;
}

/**
 * Optional whole-number field. Typing is free-form; the value commits when it parses,
 * and clears to "any" when emptied.
 */
export function CountField({ label, value, onChange, invalid, describedBy, max }: CountFieldProps) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));

  useEffect(() => {
    // Reflect external resets (Reset filters) without fighting the user's typing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((d) => {
      const parsed = d === "" ? null : Math.min(max, Number(d));
      return parsed === value ? d : value === null ? "" : String(value);
    });
  }, [value, max]);

  return (
    <label className={styles.countField} data-invalid={invalid || undefined}>
      <span className={styles.countLabel}>{label}</span>
      <input
        className={`${styles.countInput} num`}
        inputMode="numeric"
        autoComplete="off"
        placeholder="Any"
        maxLength={3}
        value={draft}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          const next = e.target.value.replace(/[^0-9]/g, "");
          setDraft(next);
          if (next === "") onChange(null);
          else onChange(Math.min(max, Number(next)));
        }}
        onBlur={() => setDraft(value === null ? "" : String(value))}
      />
    </label>
  );
}

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  shortcut?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onChange, shortcut, className, ...rest },
  ref,
) {
  return (
    <div className={[styles.search, className].filter(Boolean).join(" ")}>
      <MagnifyingGlass size={15} className={styles.searchIcon} aria-hidden />
      <input
        ref={ref}
        type="search"
        spellCheck={false}
        autoComplete="off"
        className={styles.searchInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        {...rest}
      />
      {value ? (
        <button
          type="button"
          className={styles.searchClear}
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X size={13} weight="bold" aria-hidden />
        </button>
      ) : shortcut ? (
        <kbd className={`${styles.kbd} ${styles.searchKbd}`} aria-hidden>
          {shortcut}
        </kbd>
      ) : null}
    </div>
  );
});

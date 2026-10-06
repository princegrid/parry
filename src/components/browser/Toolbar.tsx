"use client";

import { ArrowCounterClockwise, SortAscending, SortDescending } from "@phosphor-icons/react";
import type { Ref } from "react";

import { Button } from "@/components/ui/Button";
import { CheckChip, CountField, SearchField } from "@/components/ui/Fields";
import { Segmented } from "@/components/ui/Segmented";
import { rangeInvalid, type Filters } from "@/lib/client/filters";
import type { SortOrder } from "@/lib/roblox/types";

import styles from "./browser.module.css";

interface ToolbarProps {
  sort: SortOrder;
  onSortChange: (sort: SortOrder) => void;
  sortDisabled: boolean;
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  canReset: boolean;
  onReset: () => void;
  searchRef: Ref<HTMLInputElement>;
  capacity: number;
}

export function Toolbar({
  sort,
  onSortChange,
  sortDisabled,
  filters,
  onFiltersChange,
  canReset,
  onReset,
  searchRef,
  capacity,
}: ToolbarProps) {
  const invalid = rangeInvalid(filters);
  return (
    <div className={styles.toolbar} role="group" aria-label="Sort and filter servers">
      <div className={styles.toolbarGroup}>
        <Segmented
          label="Order by player count"
          value={sort}
          onChange={onSortChange}
          disabled={sortDisabled}
          options={[
            { value: "asc", label: "Fewest players", icon: <SortAscending size={15} aria-hidden /> },
            { value: "desc", label: "Most players", icon: <SortDescending size={15} aria-hidden /> },
          ]}
        />
        <div className={styles.hideFull}>
          <CheckChip
            label="Hide full"
            checked={filters.hideFull}
            onChange={(hideFull) => onFiltersChange({ hideFull })}
          />
        </div>
      </div>

      <div className={styles.toolbarGroup}>
        {/* Reserved left of the fields so they never shift, and search stays flush right, when filters become active. */}
        <div className={styles.resetSlot} data-hidden={!canReset || undefined}>
          <Button
            variant="ghost"
            onClick={onReset}
            disabled={!canReset}
            aria-hidden={!canReset || undefined}
            tabIndex={canReset ? undefined : -1}
            icon={<ArrowCounterClockwise size={14} weight="bold" aria-hidden />}
          >
            Reset
          </Button>
        </div>
        <div className={styles.range}>
          <CountField
            label="Min"
            value={filters.minPlayers}
            max={capacity}
            invalid={invalid}
            describedBy={invalid ? "range-error" : undefined}
            onChange={(minPlayers) => onFiltersChange({ minPlayers })}
          />
          <CountField
            label="Max"
            value={filters.maxPlayers}
            max={capacity}
            invalid={invalid}
            describedBy={invalid ? "range-error" : undefined}
            onChange={(maxPlayers) => onFiltersChange({ maxPlayers })}
          />
          <span className="srOnly">players</span>
        </div>
        <SearchField
          ref={searchRef}
          className={styles.searchField}
          value={filters.query}
          onChange={(query) => onFiltersChange({ query })}
          placeholder="Search instance ID"
          aria-label="Search by instance ID"
          shortcut="/"
          aria-keyshortcuts="/"
        />
      </div>

      {invalid && (
        <p id="range-error" className={styles.rangeError} role="alert">
          Min players is higher than max, so nothing can match.
        </p>
      )}
    </div>
  );
}

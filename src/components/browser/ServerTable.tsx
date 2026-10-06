"use client";

import { ArrowSquareOut, CaretDown, Copy, Play } from "@phosphor-icons/react";
import { memo, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";

import { Hint } from "@/components/ui/Hint";
import { isFull, openSlots } from "@/lib/client/filters";
import { shortId, webJoinUrl } from "@/lib/roblox/links";
import type { ChangedField } from "@/hooks/useServerBrowser";
import type { ServerInstance } from "@/lib/roblox/types";

import styles from "./browser.module.css";
import { SlotStrip } from "./SlotStrip";

export interface RowActions {
  onSelect: (id: string | null) => void;
  onJoin: (server: ServerInstance) => void;
  onCopyLink: (server: ServerInstance) => void;
  onCopyId: (server: ServerInstance) => void;
  joinHref: (id: string) => string;
  joinTarget: "_self" | "_blank";
}

interface ServerTableProps extends RowActions {
  servers: ServerInstance[];
  changed: Record<string, ChangedField[]>;
  snapshot: number;
  selectedId: string | null;
  launchingId: string | null;
  refreshing: boolean;
  /** Rendered in place of rows (skeleton, empty or error state). */
  placeholder?: ReactNode;
}

function Unavailable() {
  return (
    <span className={styles.unavailable} title="Not reported by the Roblox API">
      n/a
    </span>
  );
}

/** Moves focus to the same control in the previous/next row. */
function onGridKeyDown(event: KeyboardEvent<HTMLTableSectionElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const target = event.target as HTMLElement;
  const control = target.closest<HTMLElement>("[data-nav]");
  const row = target.closest("tr");
  if (!control || !row) return;
  let next = event.key === "ArrowDown" ? row.nextElementSibling : row.previousElementSibling;
  while (next && !next.querySelector(`[data-nav="${control.dataset.nav}"]`)) {
    next = event.key === "ArrowDown" ? next.nextElementSibling : next.previousElementSibling;
  }
  const destination = next?.querySelector<HTMLElement>(`[data-nav="${control.dataset.nav}"]`);
  if (destination) {
    event.preventDefault();
    destination.focus();
  }
}

export function ServerTable({
  servers,
  changed,
  snapshot,
  selectedId,
  launchingId,
  refreshing,
  placeholder,
  ...actions
}: ServerTableProps) {
  return (
    <div className={styles.tableWrap} data-refreshing={refreshing || undefined}>
      <table className={styles.table}>
        <caption className="srOnly">
          Public Blade Ball trading servers from the loaded pages. Select a row for the full instance ID and join link.
        </caption>
        <thead className={styles.thead}>
          <tr>
            <th scope="col" className={styles.colPlayers}>
              Players
            </th>
            <th scope="col" className={styles.colOpen}>
              Open
            </th>
            <th scope="col" className={styles.colPing}>
              <span className={styles.thWithHint}>
                Ping
                <Hint label="About API-reported ping">
                  Ping reported by the Roblox API for this server. It is not a measurement of your own
                  connection.
                </Hint>
              </span>
            </th>
            <th scope="col" className={styles.colFps}>
              FPS
            </th>
            <th scope="col" className={styles.colId}>
              Instance
            </th>
            <th scope="col" className={styles.colActions}>
              <span className="srOnly">Actions</span>
            </th>
          </tr>
        </thead>
        {placeholder ? (
          <tbody>
            <tr className={styles.placeholderRow}>
              <td colSpan={6}>{placeholder}</td>
            </tr>
          </tbody>
        ) : (
          <tbody onKeyDown={onGridKeyDown}>
            {servers.map((server) => (
              <ServerRow
                key={server.id}
                server={server}
                changed={changed[server.id]}
                snapshot={snapshot}
                selected={server.id === selectedId}
                launching={server.id === launchingId}
                {...actions}
              />
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}

interface ServerRowProps extends RowActions {
  server: ServerInstance;
  changed: ChangedField[] | undefined;
  snapshot: number;
  selected: boolean;
  launching: boolean;
}

const ServerRow = memo(
  function ServerRow({
  server,
  changed,
  snapshot,
  selected,
  launching,
  onSelect,
  onJoin,
  onCopyLink,
  onCopyId,
  joinHref,
  joinTarget,
}: ServerRowProps) {
  const full = isFull(server);
  const open = openSlots(server);
  const detailsId = `details-${server.id}`;
  // A changed value is keyed by snapshot so its highlight replays on the next change.
  const isChanged = (field: ChangedField) => changed?.includes(field) ?? false;
  const keyFor = (field: ChangedField) => (isChanged(field) ? `${field}-${snapshot}` : field);
  const flag = (field: ChangedField) => (isChanged(field) ? { "data-changed": "" } : {});

  function onRowClick(event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as HTMLElement).closest("a, button, input")) return;
    if (window.getSelection()?.toString()) return; // let people select text
    onSelect(selected ? null : server.id);
  }

  return (
    <>
      <tr
        className={styles.row}
        data-selected={selected || undefined}
        data-full={full || undefined}
        onClick={onRowClick}
      >
        <td className={styles.colPlayers}>
          <span className={styles.players}>
            <span key={keyFor("playing")} className={`${styles.playerCount} num`} {...flag("playing")}>
              {server.playing ?? <Unavailable />}
              <span className={styles.capacity}>
                /{server.maxPlayers ?? "?"}
              </span>
            </span>
            <SlotStrip playing={server.playing} maxPlayers={server.maxPlayers} />
          </span>
        </td>
        <td className={styles.colOpen}>
          {open === null ? (
            <Unavailable />
          ) : full ? (
            <span className={styles.fullTag}>Full</span>
          ) : (
            <span className={`${styles.openCount} num`}>
              {open}
              <span className={styles.mobileUnit}> open</span>
            </span>
          )}
        </td>
        <td className={styles.colPing}>
          {server.ping === null ? (
            <Unavailable />
          ) : (
            <span className="num">
              {Math.round(server.ping)}
              <span className={styles.unit}> ms</span>
            </span>
          )}
          <span className={styles.mobileUnit}> ping</span>
        </td>
        <td className={styles.colFps}>
          {server.fps === null ? (
            <Unavailable />
          ) : (
            <span className="num">
              {server.fps.toFixed(1)}
            </span>
          )}
          <span className={styles.mobileUnit}> fps</span>
        </td>
        <td className={styles.colId}>
          <button
            type="button"
            className={styles.idButton}
            data-nav="details"
            aria-expanded={selected}
            aria-controls={selected ? detailsId : undefined}
            aria-label={`Instance ${server.id}. ${selected ? "Hide" : "Show"} details`}
            title={server.id}
            onClick={() => onSelect(selected ? null : server.id)}
          >
            <span className="mono">{shortId(server.id)}</span>
            <CaretDown size={12} weight="bold" className={styles.caret} aria-hidden />
          </button>
        </td>
        <td className={styles.colActions}>
          <span className={styles.actions}>
            {full ? (
              <button
                type="button"
                className={styles.joinButton}
                data-nav="join"
                disabled
                title="This server was full at the last refresh"
              >
                Full
              </button>
            ) : (
              <a
                className={styles.joinButton}
                data-nav="join"
                href={joinHref(server.id)}
                target={joinTarget === "_blank" ? "_blank" : undefined}
                rel={joinTarget === "_blank" ? "noopener noreferrer" : undefined}
                aria-label={`Join instance ${shortId(server.id)}, ${server.playing ?? "unknown"} of ${server.maxPlayers ?? "unknown"} players`}
                onClick={() => onJoin(server)}
                data-launching={launching || undefined}
              >
                <Play size={12} weight="fill" aria-hidden />
                {launching ? "Opening" : "Join"}
              </a>
            )}
            <button
              type="button"
              className={styles.copyButton}
              data-nav="copy"
              aria-label={`Copy join link for instance ${shortId(server.id)}`}
              title="Copy join link"
              onClick={() => onCopyLink(server)}
            >
              <Copy size={15} aria-hidden />
            </button>
          </span>
        </td>
      </tr>
      {selected && (
        <tr className={styles.detailRow} id={detailsId}>
          <td colSpan={6}>
            <dl className={styles.details}>
              <div className={styles.detailItem}>
                <dt>Instance ID</dt>
                <dd>
                  <input
                    className={`${styles.detailValue} mono`}
                    readOnly
                    value={server.id}
                    aria-label="Full instance ID"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button type="button" className={styles.detailCopy} onClick={() => onCopyId(server)}>
                    <Copy size={13} aria-hidden />
                    Copy ID
                  </button>
                </dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Join link</dt>
                <dd>
                  <input
                    className={`${styles.detailValue} mono`}
                    readOnly
                    value={webJoinUrl(server.id)}
                    aria-label="Join link"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button type="button" className={styles.detailCopy} onClick={() => onCopyLink(server)}>
                    <Copy size={13} aria-hidden />
                    Copy link
                  </button>
                  <a
                    className={styles.detailCopy}
                    href={webJoinUrl(server.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ArrowSquareOut size={13} aria-hidden />
                    Open on roblox.com
                  </a>
                </dd>
              </div>
            </dl>
          </td>
        </tr>
      )}
    </>
  );
  },
  (a, b) =>
    a.server === b.server &&
    a.selected === b.selected &&
    a.launching === b.launching &&
    a.changed === b.changed &&
    (a.changed === undefined || a.snapshot === b.snapshot) &&
    a.onSelect === b.onSelect &&
    a.onJoin === b.onJoin &&
    a.onCopyLink === b.onCopyLink &&
    a.onCopyId === b.onCopyId &&
    a.joinHref === b.joinHref &&
    a.joinTarget === b.joinTarget,
);

/** Skeleton rows shaped like the real ones, for the first load. */
export function SkeletonRows({ count = 12 }: { count?: number }) {
  return (
    <div className={styles.skeleton} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeletonRow} style={{ animationDelay: `${i * 40}ms` }}>
          <span className={styles.skelPlayers} />
          <span className={styles.skelShort} />
          <span className={styles.skelShort} />
          <span className={styles.skelShort} />
          <span className={styles.skelId} />
          <span className={styles.skelActions} />
        </div>
      ))}
    </div>
  );
}

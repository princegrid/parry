import type { CSSProperties } from "react";

import styles from "./browser.module.css";

/** Above this capacity, ticks would be too thin to read; the strip switches to a plain bar. */
const MAX_TICKS = 50;

/**
 * Occupancy drawn as one tick per player slot: neutral ticks are taken,
 * accent ticks are open. Decorative; the numbers beside it carry the meaning.
 */
export function SlotStrip({ playing, maxPlayers }: { playing: number | null; maxPlayers: number | null }) {
  if (playing === null || maxPlayers === null) {
    return <span className={styles.slots} data-unknown aria-hidden />;
  }
  const taken = Math.min(1, playing / maxPlayers);
  const style = {
    "--slots": Math.min(maxPlayers, MAX_TICKS),
    "--taken": taken,
  } as CSSProperties;
  return (
    <span
      className={styles.slots}
      style={style}
      data-plain={maxPlayers > MAX_TICKS || undefined}
      data-full={playing >= maxPlayers || undefined}
      aria-hidden
    >
      <span className={styles.slotsTaken} />
    </span>
  );
}

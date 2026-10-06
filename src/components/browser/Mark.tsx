/**
 * Product mark: a ball meeting a parry stroke. A single geometric glyph, drawn once
 * here and reused for the app icon.
 */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <rect x="0.5" y="0.5" width="23" height="23" rx="6.5" fill="#17181c" stroke="rgb(255 255 255 / 0.12)" />
      <circle cx="9.5" cy="14.5" r="4" fill="#8fcdf2" />
      <path d="M8 6.5 L18.5 6.5 L15 11" stroke="#eceef2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

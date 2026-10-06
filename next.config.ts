import type { NextConfig } from "next";

/*
 * STATIC_EXPORT=1 builds the GitHub Pages version: plain files under out/, served from
 * NEXT_PUBLIC_BASE_PATH (e.g. /parry), with data read from the snapshot branch instead of
 * the /api route (the Pages workflow removes that route before building).
 */
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(staticExport && {
    output: "export",
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
    trailingSlash: true,
  }),
  // Partial prerendering is not available in export mode.
  cacheComponents: !staticExport,
  partialPrefetching: !staticExport,
  // The floating dev badge sits over the bottom-left of the status bar.
  devIndicators: false,
  // A package-lock.json higher up the disk otherwise confuses root detection.
  turbopack: { root: process.cwd() },
};

export default nextConfig;

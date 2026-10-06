import type { NextRequest } from "next/server";

import { isCursor } from "@/lib/roblox/constants";
import type { ApiErrorBody, SortOrder } from "@/lib/roblox/types";
import { clientRetryAfter, getServerPage } from "@/lib/server/roblox-servers";

const NO_STORE = { "cache-control": "no-store" };

function errorResponse(status: number, body: ApiErrorBody) {
  const headers: Record<string, string> = { ...NO_STORE };
  if (body.retryAfter) headers["retry-after"] = String(body.retryAfter);
  return Response.json(body, { status, headers });
}

/**
 * GET /api/servers?sort=asc|desc&cursor=<opaque>
 * Same-origin proxy for one fixed Roblox endpoint (the browser cannot call it: no CORS headers).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const sortParam = (params.get("sort") ?? "asc").toLowerCase();
  if (sortParam !== "asc" && sortParam !== "desc") {
    return errorResponse(400, { error: "bad_request", message: "sort must be asc or desc." });
  }
  const sort: SortOrder = sortParam;

  const cursorParam = params.get("cursor");
  const cursor = cursorParam === null || cursorParam === "" ? null : cursorParam;
  if (cursor !== null && !isCursor(cursor)) {
    return errorResponse(400, { error: "bad_request", message: "cursor is not a valid page token." });
  }

  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const clientWait = clientRetryAfter(client);
  if (clientWait !== null) {
    return errorResponse(429, {
      error: "rate_limited",
      message: "Too many refreshes from this browser.",
      retryAfter: clientWait,
    });
  }

  const outcome = await getServerPage(sort, cursor);
  if (!outcome.ok) return errorResponse(outcome.status, outcome.body);

  const stale = outcome.page.cache === "stale";
  return Response.json(outcome.page, {
    headers: {
      // Lets a CDN absorb bursts of identical requests; browsers always revalidate.
      // Saved copies served during a rate limit are never cached downstream.
      "cache-control": stale ? "no-store" : "public, max-age=0, s-maxage=20, stale-while-revalidate=10",
      "x-cache": outcome.page.cache,
    },
  });
}

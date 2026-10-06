import type { ServerInstance, SortOrder } from "@/lib/roblox/types";

export interface Filters {
  hideFull: boolean;
  minPlayers: number | null;
  maxPlayers: number | null;
  query: string;
}

export const DEFAULT_FILTERS: Filters = {
  hideFull: true,
  minPlayers: null,
  maxPlayers: null,
  query: "",
};

export function isFull(server: ServerInstance) {
  return (
    server.playing !== null && server.maxPlayers !== null && server.playing >= server.maxPlayers
  );
}

export function openSlots(server: ServerInstance) {
  if (server.playing === null || server.maxPlayers === null) return null;
  return Math.max(0, server.maxPlayers - server.playing);
}

export function filtersActive(filters: Filters) {
  return (
    filters.hideFull !== DEFAULT_FILTERS.hideFull ||
    filters.minPlayers !== null ||
    filters.maxPlayers !== null ||
    filters.query.trim() !== ""
  );
}

export function rangeInvalid(filters: Filters) {
  return (
    filters.minPlayers !== null &&
    filters.maxPlayers !== null &&
    filters.minPlayers > filters.maxPlayers
  );
}

function normaliseQuery(value: string) {
  return value.trim().toLowerCase().replace(/[^0-9a-f]/g, "");
}

/** Orders loaded servers by player count for the loaded sort. Unknown counts sink to the end. */
export function orderServers(servers: ServerInstance[], sort: SortOrder) {
  return servers
    .map((server, index) => ({ server, index }))
    .sort((a, b) => {
      const pa = a.server.playing;
      const pb = b.server.playing;
      if (pa === null || pb === null) {
        if (pa === pb) return a.index - b.index;
        return pa === null ? 1 : -1;
      }
      if (pa !== pb) return sort === "asc" ? pa - pb : pb - pa;
      return a.index - b.index;
    })
    .map(({ server }) => server);
}

/** Applies local filters to already-loaded servers. Never invents or hides data silently. */
export function applyFilters(servers: ServerInstance[], filters: Filters) {
  const query = normaliseQuery(filters.query);
  // Instance IDs are hex; a search with no hex characters cannot match anything.
  if (filters.query.trim() !== "" && query === "") return [];
  const { minPlayers, maxPlayers } = filters;
  return servers.filter((server) => {
    if (filters.hideFull && isFull(server)) return false;
    if (minPlayers !== null || maxPlayers !== null) {
      // A server with an unknown player count cannot satisfy a numeric range.
      if (server.playing === null) return false;
      if (minPlayers !== null && server.playing < minPlayers) return false;
      if (maxPlayers !== null && server.playing > maxPlayers) return false;
    }
    if (query && !server.id.replace(/-/g, "").includes(query)) return false;
    return true;
  });
}

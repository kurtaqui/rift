import type { PlayerSummary } from "@rift/data-access";
import { fetchPlayerSummary } from "@rift/data-access";
import { queryOptions } from "@tanstack/react-query";

export type { PlayerSummary };

/**
 * From the browser, use "/api" so the shell's reverse proxy is hit.
 * fetchPlayerSummary is designed to accept either an absolute URL (server)
 * or a path-relative base (browser).
 */
export const playerSummaryQueryOptions = () =>
	queryOptions({
		queryKey: ["player", "summary"],
		queryFn: async () => fetchPlayerSummary("/api"),
		retry: false,
		// Remove from cache immediately when the component unmounts so stale
		// signed-in data from a previous visit never bleeds into a signed-out render.
		gcTime: 0,
	});

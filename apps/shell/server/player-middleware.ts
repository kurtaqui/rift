import type { PlayerSummaryUser } from "@rift/data-access";
import { enhance } from "@universal-middleware/core";
import type { UniversalMiddleware } from "@universal-middleware/core";

import { RIFT_API_URL } from "./env";

/**
 * Shape of `pageContext.player` — only the fields the Nav and dashboard
 * actually need. Kept narrow on purpose so SSR doesn't ship the entire
 * player record (champions/matches) to every page.
 */
export type PageContextPlayer = Pick<PlayerSummaryUser, "summonerName" | "profileIconId" | "summonerLevel"> & {
	id: string;
};

function isPageContextPlayer(value: unknown): value is PageContextPlayer {
	if (!value || typeof value !== "object") {
		return false;
	}
	const obj: Record<string, unknown> = value;
	return (
		typeof obj.id === "string" &&
		typeof obj.summonerName === "string" &&
		typeof obj.profileIconId === "number" &&
		typeof obj.summonerLevel === "number"
	);
}

/**
 * Universal middleware that hydrates `pageContext.player` for signed-in
 * requests. Runs after `authjsSessionMiddleware` so it can read
 * `context.session`. On any failure (api down, player not found) the
 * context.player is set to `null` and the request still serves — the Nav
 * gracefully falls back to `session.user.name`.
 *
 * This middleware is shell-scoped on purpose (instead of living in
 * `libs/auth`) so the auth lib stays framework- and api-agnostic.
 */
export const playerMiddleware: UniversalMiddleware = enhance(
	async (request, context) => {
		const session = context.session;
		if (!session?.user) {
			return { ...context, player: null };
		}

		try {
			const cookie = request.headers.get("cookie") ?? "";
			const response = await fetch(`${RIFT_API_URL}/player/me`, {
				headers: { cookie, accept: "application/json" },
			});
			if (!response.ok) {
				return { ...context, player: null };
			}
			const data: unknown = await response.json();
			if (!isPageContextPlayer(data)) {
				return { ...context, player: null };
			}
			return {
				...context,
				player: {
					id: data.id,
					summonerName: data.summonerName,
					profileIconId: data.profileIconId,
					summonerLevel: data.summonerLevel,
				} satisfies PageContextPlayer,
			};
		} catch (error) {
			console.warn("playerMiddleware:", error);
			return { ...context, player: null };
		}
	},
	{
		name: "rift:player-middleware",
		immutable: false,
	},
);

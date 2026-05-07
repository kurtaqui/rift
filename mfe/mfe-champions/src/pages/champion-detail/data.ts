import type { Champion, ChampionAbility, ChampionSkin } from "@rift/champion";
import { createApiClient } from "@rift/data-access";
import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";

import { RIFT_API_URL } from "../../env";

export type Data = Champion & {
	abilities: ChampionAbility[];
	skins: ChampionSkin[];
};

/**
 * Fetch champion detail by ID. Throws a plain Error on 404 — callers that
 * want Vike 404 behaviour should use the `data()` Vike adapter below.
 */
export async function fetchChampionDetail(id: string): Promise<Data> {
	const client = createApiClient(RIFT_API_URL);
	const res = await client.champions[":id"].$get({ param: { id } });
	if (res.status === 404) {
		throw new Error(`Champion not found: ${id}`);
	}
	if (!res.ok) {
		throw new Error(`Failed to load champion ${id}: HTTP ${res.status}`);
	}
	const json = (await res.json()) as { champion: Champion; abilities: ChampionAbility[]; skins: ChampionSkin[] };
	return { ...json.champion, abilities: json.abilities, skins: json.skins };
}

/** Vike page adapter — throws `render(404)` so Vike renders the 404 page. */
export async function data(pageContext: PageContextServer): Promise<Data> {
	try {
		return await fetchChampionDetail(pageContext.routeParams.id);
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Champion not found:")) {
			throw render(404);
		}
		throw error;
	}
}

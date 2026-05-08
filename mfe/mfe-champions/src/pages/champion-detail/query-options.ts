import type { Champion, ChampionAbility, ChampionSkin } from "@rift/champion";
import { createApiClient } from "@rift/data-access";
import { queryOptions } from "@tanstack/react-query";

import { RIFT_API_URL } from "../../env";

export type Data = Champion & {
	abilities: ChampionAbility[];
	skins: ChampionSkin[];
};

/**
 * Fetch champion detail by ID. Throws a plain Error on 404 — callers that
 * want Vike 404 behaviour should use the `data()` Vike adapter in `data.ts`.
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
	// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- res.json() returns any; shape is validated by the API contract
	const json = (await res.json()) as { champion: Champion; abilities: ChampionAbility[]; skins: ChampionSkin[] };
	return { ...json.champion, abilities: json.abilities, skins: json.skins };
}

export const championDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["champion", id],
		queryFn: async () => fetchChampionDetail(id),
	});

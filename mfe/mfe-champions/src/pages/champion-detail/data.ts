import type { Champion, ChampionAbility, ChampionSkin } from "@rift/champion";
import { createApiClient } from "@rift/data-access";
import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";

import { RIFT_API_URL } from "../../env";

export type Data = Champion & {
	abilities: ChampionAbility[];
	skins: ChampionSkin[];
};

export async function data(pageContext: PageContextServer): Promise<Data> {
	const { id } = pageContext.routeParams;
	const client = createApiClient(RIFT_API_URL);
	const res = await client.champions[":id"].$get({ param: { id } });
	if (res.status === 404) {
		throw render(404);
	}
	if (!res.ok) {
		throw new Error(`Failed to load champion ${id}: HTTP ${res.status}`);
	}
	const { champion, abilities, skins } = await res.json();
	return { ...champion, abilities, skins };
}

import type { Champion, ChampionTier } from "@rift/champion";
import { createApiClient } from "@rift/data-access";

export type EnrichedTierEntry = ChampionTier & {
	champion: Pick<Champion, "id" | "name" | "splashArtUrl" | "squareIconUrl" | "roles">;
};

export type Data = {
	entries: EnrichedTierEntry[];
	patches: string[];
};

const API_URL = process.env.RIFT_API_URL ?? "http://localhost:3100";

export async function data(): Promise<Data> {
	const client = createApiClient(API_URL);
	const [tiersRes, championsRes] = await Promise.all([
		client["tier-list"].$get({ query: {} }),
		client.champions.$get(),
	]);
	if (!tiersRes.ok) {
		throw new Error(`Failed to load tier list: HTTP ${tiersRes.status}`);
	}
	if (!championsRes.ok) {
		throw new Error(`Failed to load champions: HTTP ${championsRes.status}`);
	}
	const tiers = await tiersRes.json();
	const champions = await championsRes.json();
	const byId = new Map(champions.map(c => [c.id, c]));

	const entries: EnrichedTierEntry[] = tiers.flatMap(t => {
		const champion = byId.get(t.championId);
		if (!champion) {
			return [];
		}
		return [
			{
				...t,
				champion: {
					id: champion.id,
					name: champion.name,
					splashArtUrl: champion.splashArtUrl,
					squareIconUrl: champion.squareIconUrl,
					roles: champion.roles,
				},
			},
		];
	});
	const patches = [...new Set(entries.map(e => e.patch))].toSorted().toReversed();
	return { entries, patches };
}

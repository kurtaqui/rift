import type { Champion } from "@rift/champion";
import { createApiClient } from "@rift/data-access";

import { RIFT_API_URL } from "../../env";

export type Data = {
	champions: Champion[];
};

export async function data(): Promise<Data> {
	const client = createApiClient(RIFT_API_URL);
	const res = await client.champions.$get();
	if (!res.ok) {
		throw new Error(`Failed to load champions: HTTP ${res.status}`);
	}
	const champions = await res.json();
	return { champions };
}

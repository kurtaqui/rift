import type { Champion } from "@rift/champion";
import { createApiClient } from "@rift/data-access";

export type Data = {
	champions: Champion[];
};

const API_URL = process.env.RIFT_API_URL ?? "http://localhost:3100";

export async function data(): Promise<Data> {
	const client = createApiClient(API_URL);
	const res = await client.champions.$get();
	if (!res.ok) {
		throw new Error(`Failed to load champions: HTTP ${res.status}`);
	}
	const champions = await res.json();
	return { champions };
}

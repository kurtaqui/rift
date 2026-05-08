import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";

import { fetchChampionDetail } from "./query-options";

export type { Data } from "./query-options";
export { fetchChampionDetail };

/** Vike page adapter — throws `render(404)` so Vike renders the 404 page. */
export async function data(pageContext: PageContextServer): Promise<Awaited<ReturnType<typeof fetchChampionDetail>>> {
	try {
		return await fetchChampionDetail(pageContext.routeParams.id);
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Champion not found:")) {
			throw render(404);
		}
		throw error;
	}
}

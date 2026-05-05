import { fetchMfeFragment } from "@rift/mfe-fragment/server";
import type { MfeFragmentData } from "@rift/mfe-fragment/client";
import type { PageContextServer } from "vike/types";

export async function data(pageContext: PageContextServer): Promise<MfeFragmentData> {
	const { html: mfeHtml, data: mfeData } = await fetchMfeFragment("champions", pageContext.urlOriginal);
	return { mfeHtml, mfeData };
}

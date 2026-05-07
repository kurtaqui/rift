import type { MfeShellPageData } from "@rift/mfe-fragment/client";
import { fetchMfeFragmentForPathname } from "@rift/mfe-fragment/server";
import type { PageContextServer } from "vike/types";

const MFE_TIER_LIST_URL = process.env.MFE_TIER_LIST_URL ?? "http://localhost:3012";

export type TierListData = MfeShellPageData;

export async function data(pageContext: PageContextServer): Promise<TierListData> {
	const pathname = pageContext.urlPathname;
	const { html: mfeHtml, data: mfeData } = await fetchMfeFragmentForPathname(MFE_TIER_LIST_URL, pathname);
	return {
		mfeHtml,
		mfeData,
		mfeSrc: MFE_TIER_LIST_URL,
		pageContext: { route: pageContext.urlPathname },
	};
}

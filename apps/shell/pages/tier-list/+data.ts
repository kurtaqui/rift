import type { MfeShellPageData } from "@rift/mfe-fragment/client";
import { fetchMfeFragmentForPathname } from "@rift/mfe-fragment/server";
import type { PageContextServer } from "vike/types";

const MFE_URL = process.env.MFE_TIER_LIST_URL ?? "http://localhost:3012";

export type TierListData = MfeShellPageData;

export async function data(pageContext: PageContextServer): Promise<TierListData> {
	const { urlPathname, isClientSideNavigation } = pageContext;
	let html: string | null = null;
	let transferState: unknown = null;

	if (!isClientSideNavigation) {
		({ html, transferState } = await fetchMfeFragmentForPathname(MFE_URL, urlPathname));
	}

	return {
		html,
		transferState,
		mfeSrc: MFE_URL,
		pageContext: {
			route: urlPathname,
		},
	};
}

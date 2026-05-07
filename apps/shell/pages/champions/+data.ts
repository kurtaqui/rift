import type { MfeShellPageData } from "@rift/mfe-fragment/client";
import { fetchMfeFragmentForPathname } from "@rift/mfe-fragment/server";
import type { PageContextServer } from "vike/types";

const MFE_CHAMPIONS_URL = process.env.MFE_CHAMPIONS_URL ?? "http://localhost:3011";

export type ChampionsData = MfeShellPageData;

export async function data(pageContext: PageContextServer): Promise<ChampionsData> {
	const pathname = pageContext.urlPathname;
	const { html: mfeHtml, data: mfeData } = await fetchMfeFragmentForPathname(MFE_CHAMPIONS_URL, pathname);
	return {
		mfeHtml,
		mfeData,
		mfeSrc: MFE_CHAMPIONS_URL,
		pageContext: { route: pathname },
	};
}

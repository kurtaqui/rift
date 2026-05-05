import type { PageContext } from "vike/types";

// Match both "/tier-list" (exact) and any sub-path "/tier-list/*".
export default function route(pageContext: PageContext) {
	const { urlPathname } = pageContext;
	if (urlPathname === "/tier-list" || urlPathname.startsWith("/tier-list/")) {
		return {};
	}
	return false;
}

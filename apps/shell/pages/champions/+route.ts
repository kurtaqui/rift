import type { PageContext } from "vike/types";

// Match both "/champions" (exact) and any sub-path "/champions/*".
export default function route(pageContext: PageContext) {
	const { urlPathname } = pageContext;
	if (urlPathname === "/champions" || urlPathname.startsWith("/champions/")) {
		return {};
	}
	return false;
}

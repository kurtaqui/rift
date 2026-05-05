import type { PageContext } from "vike/types";

function hasMfeName(data: unknown): data is { mfeData?: { name?: string } } {
	return typeof data === "object" && data !== null;
}

export default function title(pageContext: PageContext): string {
	if (!hasMfeName(pageContext.data)) {
		return "Champions — Rift";
	}
	const name = pageContext.data.mfeData?.name;
	return name ? `${name} — Champions · Rift` : "Champions — Rift";
}

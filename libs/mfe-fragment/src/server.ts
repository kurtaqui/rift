export type MfeTarget = "champions" | "tier-list";

export type MfeFragmentResult = {
	html: string | null;
	data: unknown;
};

export class MfeFragmentError extends Error {
	readonly mfe: MfeTarget;
	readonly fragmentUrl: string;

	constructor(mfe: MfeTarget, url: string, cause: unknown) {
		super(`MFE fragment fetch failed for "${mfe}" at "${url}": ${String(cause)}`);
		this.name = "MfeFragmentError";
		this.mfe = mfe;
		this.fragmentUrl = url;
		this.cause = cause;
	}
}

const MFE_BASE_URLS: Record<MfeTarget, () => string> = {
	champions: () => process.env["MFE_CHAMPIONS_URL"] ?? "http://localhost:3011",
	"tier-list": () => process.env["MFE_TIER_LIST_URL"] ?? "http://localhost:3012",
};

/**
 * Shell URL prefix for each MFE. The fragment server serves pages at MFE-root-
 * relative paths (e.g. `/`, `/:id`). This prefix is stripped before building
 * the fragment request URL so shell `/champions/ahri` becomes `/ahri` on the
 * MFE fragment server.
 */
const MFE_BASE_PATHS: Record<MfeTarget, string> = {
	champions: "/champions",
	"tier-list": "/tier-list",
};

/**
 * Extract just the pathname from a URL string, normalizing Vike internals:
 *   - Strips the scheme/host when a full URL is passed
 *   - Strips `.pageContext.json` (the SPA pageContext fetch suffix)
 *   - Strips the trailing `/index` that Vike appends before `.pageContext.json`
 *     e.g. `/champions/index.pageContext.json` → `/champions`
 *          `/champions/ahri/index.pageContext.json` → `/champions/ahri`
 */
function toPathname(url: string): string {
	let pathname = url;
	try {
		pathname = new URL(url).pathname;
	} catch {
		// already a relative path
	}
	// Strip Vike's pageContext suffix first, then the /index it inserts.
	pathname = pathname.replace(/\.pageContext\.[a-z]+$/, "");
	pathname = pathname.replace(/\/index$/, "") || "/";
	return pathname;
}

/**
 * Strip the MFE's shell prefix from a pathname, returning an MFE-root-relative path.
 *   "/champions"       → "/"
 *   "/champions/ahri"  → "/ahri"
 *   "/tier-list"       → "/"
 */
function toMfePathname(mfe: MfeTarget, shellPathname: string): string {
	const base = MFE_BASE_PATHS[mfe];
	const stripped = shellPathname.startsWith(base) ? shellPathname.slice(base.length) : shellPathname;
	return stripped || "/";
}

/**
 * Fetch a server-rendered HTML fragment + page data from an MFE fragment server.
 *
 * Returns `{ html: null, data: null }` when:
 * - `MFE_SSR_MODE=local` is set (explicit local-dev bypass), OR
 * - The MFE fragment server is unreachable (connection refused) — falls back to
 *   client-side rendering with a console warning instead of crashing the shell.
 *
 * Throws `MfeFragmentError` for non-network errors (HTTP 4xx/5xx, malformed
 * response) so the shell's Vike error boundary can surface them.
 */
export async function fetchMfeFragment(mfe: MfeTarget, url: string): Promise<MfeFragmentResult> {
	if (process.env["MFE_SSR_MODE"] === "local") {
		return { html: null, data: null };
	}

	const pathname = toPathname(url);
	const mfePathname = toMfePathname(mfe, pathname);
	const baseUrl = MFE_BASE_URLS[mfe]();
	const endpoint = `${baseUrl}/fragment?url=${encodeURIComponent(mfePathname)}`;

	try {
		const res = await fetch(endpoint);
		if (!res.ok) {
			throw new MfeFragmentError(mfe, endpoint, new Error(`HTTP ${res.status} ${res.statusText}`));
		}
		return (await res.json()) as MfeFragmentResult;
	} catch (error) {
		if (error instanceof MfeFragmentError) {
			throw error;
		}
		// Network-level failure (ECONNREFUSED, DNS, etc.) — MFE server not running.
		// Degrade gracefully to client-only rendering rather than crashing the shell.
		console.warn(`[mfe-fragment] ${mfe} fragment server unreachable (${baseUrl}), falling back to CSR.`);
		return { html: null, data: null };
	}
}

/**
 * Extract the inner app HTML from a full Vike document using comment markers.
 * Fallback utility for MFEs that do not yet have a custom `onRenderHtml`.
 * The primary path is the custom `onRenderHtml` from `@rift/mfe-fragment/renderer`.
 */
export function extractMfeFragment(html: string): string {
	const START = "<!--mfe-fragment-start-->";
	const END = "<!--mfe-fragment-end-->";
	const start = html.indexOf(START);
	const end = html.indexOf(END);
	if (start === -1 || end === -1) {
		return html;
	}
	return html.slice(start + START.length, end);
}

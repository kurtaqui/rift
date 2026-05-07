export type MfeFragmentResult = {
	html: string | null;
	data: unknown;
};

function toPathname(route: string): string {
	try {
		return new URL(route).pathname || "/";
	} catch {
		return route || "/";
	}
}

export function inferMountPath(route: string): string {
	const pathname = toPathname(route);
	const firstSegment = pathname.split("/").find(Boolean);
	return firstSegment ? `/${firstSegment}` : "/";
}

export function toMfeRoute(route: string, mountPath: string): string {
	const pathname = toPathname(route);

	if (mountPath === "/") {
		return pathname || "/";
	}

	if (pathname === mountPath) {
		return "/";
	}

	if (pathname.startsWith(`${mountPath}/`)) {
		return pathname.slice(mountPath.length) || "/";
	}

	return pathname || "/";
}

export type ResolvedMfePath = {
	mountPath: string;
	route: string;
};

export function resolveMfePath(pathname: string): ResolvedMfePath {
	const mountPath = inferMountPath(pathname);
	const route = toMfeRoute(pathname, mountPath);
	return { mountPath, route };
}

export class MfeFragmentError extends Error {
	readonly src: string;
	readonly fragmentUrl: string;

	constructor(src: string, url: string, cause: unknown) {
		super(`MFE fragment fetch failed at "${url}": ${String(cause)}`);
		this.name = "MfeFragmentError";
		this.src = src;
		this.fragmentUrl = url;
		this.cause = cause;
	}
}

/**
 * Fetch SSR HTML + data from an MFE fragment endpoint.
 *
 * @param src      Base URL of the MFE server, e.g. `http://localhost:3011`
 * @param route    MFE-relative path, e.g. `/` or `/ahri`
 * @param basePath Shell mount path, e.g. `/champions`
 *
 * Returns `{ html: null, data: null }` when the server is unreachable so the
 * shell degrades to client-side rendering instead of crashing.
 * Throws `MfeFragmentError` for HTTP 4xx/5xx responses.
 */
export async function fetchMfeFragment(src: string, route: string, basePath = ""): Promise<MfeFragmentResult> {
	const endpoint = `${src}/fragment?route=${encodeURIComponent(route)}&basePath=${encodeURIComponent(basePath)}`;

	try {
		const res = await fetch(endpoint);
		if (!res.ok) {
			throw new MfeFragmentError(src, endpoint, new Error(`HTTP ${res.status} ${res.statusText}`));
		}
		return (await res.json()) as MfeFragmentResult;
	} catch (error) {
		if (error instanceof MfeFragmentError) {
			throw error;
		}
		console.warn(`[mfe-fragment] fragment server unreachable (${src}), falling back to CSR.`);
		return { html: null, data: null };
	}
}

/**
 * Resolve mountPath + MFE-relative route from a shell pathname, then fetch
 * SSR HTML + data from the fragment endpoint.
 */
export async function fetchMfeFragmentForPathname(src: string, pathname: string): Promise<MfeFragmentResult> {
	const { mountPath, route } = resolveMfePath(pathname);
	return fetchMfeFragment(src, route, mountPath);
}

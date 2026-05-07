import { useEffect, useRef, useMemo } from "react";

export type MfeFragmentData = {
	html: string | null;
	transferState: unknown;
};

export type MfeSlotRouteContext = Pick<MfeSlotPageContext, "route">;

export type MfeShellPageData = MfeFragmentData & {
	mfeSrc: string;
	pageContext: MfeSlotRouteContext;
};

export type MfeSlotPageContext = {
	/** Shell route, e.g. `/champions/ahri` or `/tier-list`. */
	route: string;
	/**
	 * Shell path prefix mounted for this MFE, e.g. `/champions` or `/tier-list`.
	 * Optional: defaults to the first path segment of `route`.
	 */
	mountPath?: string;
	/** True on first page load (hard refresh). False on Vike SPA navigations. */
	isHydration?: boolean | undefined;
};

type MfeMount = (
	container: HTMLElement,
	props: {
		data?: unknown;
		route?: string;
		mountPath?: string;
		ssrHtml?: string | null;
		isHydration?: boolean;
	},
) => void;

/**
 * Injects a `<script type="module">` tag for the MFE client bundle exactly
 * once per unique `src` origin. Idempotent — safe to call on every render.
 *
 * The browser fetches the script from the MFE server (e.g. `:3011/mfe.js`)
 * so source maps are served from the same origin — DevTools resolves them
 * automatically without any shell-side configuration.
 */
function injectMfeScript(src: string): void {
	const isDev = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true;
	const scriptUrl = isDev ? `${src}/src/client-entry.ts` : `${src}/mfe.js`;
	if (document.querySelector(`script[data-mfe-src="${CSS.escape(scriptUrl)}"]`)) {
		return;
	}
	const el = document.createElement("script");
	el.type = "module";
	el.src = scriptUrl;
	el.dataset["mfeSrc"] = scriptUrl;
	document.head.append(el);
}

type MfeSlotProps = {
	/** Base URL of the MFE server, e.g. `http://localhost:3011`. */
	src: string;
	/** Shared page context consumed by the MFE host. */
	pageContext: MfeSlotPageContext;
	/** SSR HTML from the fragment endpoint. `null` → CSR-only. */
	ssrHtml: string | null;
	/** Data returned alongside the SSR HTML, forwarded to the client App. */
	ssrData: unknown;
};

function toMfeRoute(route: string, mountPath: string): string {
	if (route === "") {
		return "/";
	}

	let pathname = route;
	try {
		pathname = new URL(route).pathname;
	} catch {
		// already a pathname
	}

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

function inferMountPath(route: string): string {
	let pathname = route;
	try {
		pathname = new URL(route).pathname;
	} catch {
		// already a pathname
	}
	const firstSegment = pathname.split("/").find(Boolean);
	return firstSegment ? `/${firstSegment}` : "/";
}

/**
 * Generic MFE host component.
 *
 * Server render: inlines `ssrHtml` so the page is immediately visible.
 *
 * Client mount:
 * 1. Injects `<src>/mfe.js` — the MFE's self-contained client bundle. Source
 *    maps resolve from the MFE origin (dev: full; prod: hidden).
 * 2. Polls for `window.__mfe_mount__<src>` set by the MFE bundle, then lets
 *    the MFE mount/hydrate itself using its own React + ReactDOM runtime.
 * 3. Listens for `mfe:navigate` CustomEvents from the MFE and calls
 *    `history.pushState` to sync the URL without a Vike round-trip.
 *
 * Vike SPA nav: when `route` changes after mount, calls
 * `window.__mfe_navigate__<src>(newRoute)` to drive MemoryRouter programmatically.
 */
export function MfeSlot({ src, pageContext, ssrHtml, ssrData }: MfeSlotProps): React.JSX.Element {
	const { route, mountPath, isHydration = false } = pageContext;
	const wrapperRef = useRef<HTMLDivElement>(null);
	const hasMountedRef = useRef(false);
	const initialSsrHtmlRef = useRef(ssrHtml ?? "");
	const htmlContent = useMemo(() => ({ __html: initialSsrHtmlRef.current }), []);
	const resolvedMountPath = useMemo(() => mountPath ?? inferMountPath(route), [mountPath, route]);
	const mfeRoute = useMemo(() => toMfeRoute(route, resolvedMountPath), [route, resolvedMountPath]);

	// Handle Vike SPA navigation: route prop changed after mount.
	useEffect(() => {
		if (!hasMountedRef.current) {
			return;
		}
		const nav = (globalThis as unknown as Record<string, unknown>)[`__mfe_navigate__${src}`];
		if (typeof nav === "function") {
			(nav as (r: string) => void)(mfeRoute);
		}
		// oxlint-disable-next-line react-hooks/exhaustive-deps -- only route changes after mount
	}, [mfeRoute]);

	useEffect(() => {
		if (!wrapperRef.current) {
			return;
		}

		const wrapper = wrapperRef.current;

		// Bubble intra-MFE navigations to the shell so the URL stays in sync.
		const onMfeNavigate = (e: Event): void => {
			const detail = (e as CustomEvent<string>).detail;
			if (typeof detail === "string" && detail !== globalThis.location.pathname) {
				globalThis.history.pushState(null, "", detail);
			}
		};
		wrapper.addEventListener("mfe:navigate", onMfeNavigate);

		injectMfeScript(src);

		// Poll for the MFE mount function registered by the injected script.
		const mountKey = `__mfe_mount__${src}`;
		const poll = setInterval(() => {
			const mount = (globalThis as unknown as Record<string, unknown>)[mountKey];
			if (typeof mount !== "function") {
				return;
			}
			clearInterval(poll);
			(mount as MfeMount)(wrapper, {
				data: ssrData ?? undefined,
				route: mfeRoute,
				mountPath: resolvedMountPath,
				ssrHtml: isHydration ? ssrHtml : null,
				isHydration,
			});
			hasMountedRef.current = true;
		}, 20);

		return () => {
			clearInterval(poll);
			wrapper.removeEventListener("mfe:navigate", onMfeNavigate);
		};
		// oxlint-disable-next-line react-hooks/exhaustive-deps -- mount effect runs once
	}, [src, ssrData, ssrHtml, isHydration, mfeRoute, resolvedMountPath]);

	return (
		<div
			ref={wrapperRef}
			// oxlint-disable-next-line react/no-danger -- intentional: MFE SSR fragment HTML snapshot
			dangerouslySetInnerHTML={htmlContent}
			suppressHydrationWarning
		/>
	);
}

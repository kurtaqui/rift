import { init, loadRemote } from "@module-federation/runtime";
import { useMemo, useEffect, useRef } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

// In Vike's dev server, the federation plugin's bootstrap virtual module does
// not run before component code, so the MF runtime is never initialized and
// loadRemote() throws #RUNTIME-009. Call init() here at module evaluation time
// to register the runtime. init() is idempotent — safe to call even if the
// plugin's own bootstrap fires later.
if (import.meta.env.DEV) {
	init({
		name: "shell",
		remotes: [
			{
				name: "mfe-champions",
				entry: `${import.meta.env.VITE_MFE_CHAMPIONS_URL}/mf-manifest.json`,
				type: "module",
			},
			{
				name: "mfe-tier-list",
				entry: `${import.meta.env.VITE_MFE_TIER_LIST_URL}/mf-manifest.json`,
				type: "module",
			},
		],
	});
}

export type MfeFragmentData = {
	mfeHtml: string | null;
	mfeData: unknown;
};

/** Matches the `MfeTarget` in server.ts — kept in sync manually (separate browser/server bundles). */
export type MfeTarget = "champions" | "tier-list";

/**
 * Module Federation remote name for each MFE's single `./app` entry.
 * The shell never references internal MFE page names.
 */
const MFE_REMOTES: Record<MfeTarget, string> = {
	champions: "mfe-champions/app",
	"tier-list": "mfe-tier-list/app",
};

/**
 * Shell URL prefix for each MFE. Passed to the remote App as `basePath` so
 * it can seed its MemoryRouter with the correct MFE-relative path.
 *   shell "/champions/ahri"  → basePath "/champions"  → MFE router sees "/ahri"
 */
const MFE_BASE_PATHS: Record<MfeTarget, string> = {
	champions: "/champions",
	"tier-list": "/tier-list",
};

type AppModule = { default: React.ComponentType<{ data?: unknown; basePath?: string }> };

type MfeSlotProps = {
	/** Which MFE to render — shell never names internal MF remote paths. */
	mfe: MfeTarget;
	/** Pre-rendered HTML from the MFE fragment server (null in local dev mode). */
	mfeHtml: string | null;
	/** Serialised page data returned alongside the fragment HTML. */
	mfeData: unknown;
	/**
	 * Whether this is the initial SSR hydration render (hard refresh).
	 * Pass `pageContext.isHydration` from the shell page component.
	 * True  → use `hydrateRoot` to attach to server-rendered DOM (zero flicker).
	 * False → use `createRoot` on a fresh imperative node (SPA navigation).
	 * Defaults to false, which is the safe fallback (fresh mount).
	 */
	isHydration?: boolean | undefined;
};

/**
 * Renders an MFE page inside the shell.
 *
 * SSR / SPA navigation:
 *   The shell's `+data.ts` calls `fetchMfeFragment` and returns `{ mfeHtml, mfeData }`
 *   via `passToClient`. `MfeSlot` immediately renders the pre-built HTML via
 *   `dangerouslySetInnerHTML` — content is visible before any JS runs.
 *
 * Client mount (useEffect):
 *   Loads the MFE's `./app` entry via Module Federation and calls `hydrateRoot`
 *   when SSR HTML is present (attaches React fibers to existing DOM — zero flicker),
 *   or `createRoot` when no SSR HTML is available (local dev / fallback).
 *   The App component receives `data` (identical to SSR data) and `basePath`
 *   (the shell prefix) so its MemoryRouter picks the right child route.
 *
 * Local dev (MFE_SSR_MODE=local):
 *   `mfeHtml` is `null`. The container starts empty and React fills it after the
 *   remote is loaded.
 */
export function MfeSlot({ mfe, mfeHtml, mfeData, isHydration = false }: MfeSlotProps): React.JSX.Element {
	const wrapperRef = useRef<HTMLDivElement>(null);
	// Track whether we've already created a React root to avoid double-mounting.
	const rootMountedRef = useRef(false);

	// Stable object reference for dangerouslySetInnerHTML to satisfy react-perf rule.
	const htmlContent = useMemo(() => ({ __html: mfeHtml ?? "" }), [mfeHtml]);

	useEffect(() => {
		if (rootMountedRef.current || !wrapperRef.current) {
			return;
		}
		rootMountedRef.current = true;

		const wrapper = wrapperRef.current;
		const basePath = MFE_BASE_PATHS[mfe];

		/**
		 * Mount the App component into the wrapper:
		 *
		 * mfeHtml && isHydration (hard refresh):
		 *   `hydrateRoot` — DOM was written by the server. React attaches fibers and
		 *   event handlers to the existing nodes without touching them → zero flicker.
		 *   `hydrateRoot` is NOT subject to React 19's restriction that bans `createRoot`
		 *   on a node with `dangerouslySetInnerHTML`; it is the intended API for this case.
		 *
		 * mfeHtml && !isHydration (SPA navigation):
		 *   DOM content was placed by React's own `dangerouslySetInnerHTML` (client-side
		 *   render), so `hydrateRoot` would fail with a diff error and `createRoot` would
		 *   trigger React 19's restriction. Create an imperative child node that React
		 *   never managed, clear the wrapper, and mount there.
		 *
		 * !mfeHtml (MFE_SSR_MODE=local / fragment server unreachable):
		 *   Wrapper is an empty div (no dangerouslySetInnerHTML) — `createRoot` directly.
		 */
		const mountApp = (App: React.ComponentType<{ data?: unknown; basePath?: string }>): void => {
			const element = <App data={mfeData ?? undefined} basePath={basePath} />;
			if (mfeHtml && isHydration) {
				// Hard refresh: DOM was written by the server.
				hydrateRoot(wrapper, element);
			} else if (mfeHtml) {
				// SPA nav: DOM was placed by React's dangerouslySetInnerHTML.
				// Must clear and mount onto an imperative (non-React-managed) child node.
				const mountPoint = document.createElement("div");
				wrapper.innerHTML = "";
				wrapper.append(mountPoint);
				createRoot(mountPoint).render(element);
			} else {
				// No SSR HTML — empty wrapper, createRoot directly.
				createRoot(wrapper).render(element);
			}
		};

		// Load via Module Federation. The federation plugin is always active in
		// the `client` environment (dev + build), so the runtime is initialized
		// by the generated federation bootstrap before any component mounts.
		const remoteName = MFE_REMOTES[mfe];
		loadRemote<AppModule>(remoteName)
			.then(remote => {
				if (!remote?.default) {
					return;
				}
				mountApp(remote.default);
			})
			.catch(console.error);
		// mfe is fixed per render; mfeData intentionally excluded —
		// re-mounting on data change would tear down and recreate the React root.
		// oxlint-disable-next-line react-hooks/exhaustive-deps -- caller-controlled deps, static mfe
	}, [mfe]);

	// Always render dangerouslySetInnerHTML when mfeHtml is present.
	// This ensures the server and client produce identical HTML (no hydration mismatch).
	// The useEffect then decides between hydrateRoot (hard refresh) or the imperative
	// mountPoint + createRoot approach (SPA nav) based on isHydration — client-only.
	// suppressHydrationWarning: the inner HTML is a foreign React tree — the shell
	// should not validate it during its own hydration pass.
	if (mfeHtml) {
		return (
			<div
				ref={wrapperRef}
				// oxlint-disable-next-line react/no-danger -- intentional: embedding MFE SSR fragment HTML
				dangerouslySetInnerHTML={htmlContent}
				suppressHydrationWarning
			/>
		);
	}

	return <div ref={wrapperRef} />;
}

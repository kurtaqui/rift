import { loadRemote } from "@module-federation/runtime";
import { useMemo, useEffect, useRef } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

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
	// todo: use MF for dev?
	/**
	 * Dev-mode loader: a `() => import("...")` pointing directly at the MFE's
	 * `App.tsx` via a Vite alias. When provided, this is used instead of the
	 * Module Federation `loadRemote` call so that client-side React mounts even
	 * without a production MF bundle. Should be `undefined` in production builds.
	 */
	devLoader?: (() => Promise<AppModule>) | undefined;
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
export function MfeSlot({ mfe, mfeHtml, mfeData, devLoader, isHydration = false }: MfeSlotProps): React.JSX.Element {
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

		// Dev mode: use the caller-supplied direct Vite import instead of MF.
		// `devLoader` is a `() => import("~mfe/...")` alias resolved by the shell's
		// Vite config — no MF runtime required.
		if (devLoader) {
			devLoader()
				.then(mod => {
					mountApp(mod.default);
				})
				.catch(console.error);
			return;
		}

		// Production: load via Module Federation.
		// `loadRemote` asserts the MF runtime is initialized synchronously before
		// returning a promise. In dev mode the federation plugin is disabled
		// (`command !== "build"` in vite.config.ts), so the runtime is never
		// initialized and the assertion throws. Wrap in try-catch so the SSR HTML
		// from the fragment server remains as-is instead of crashing the page.
		// In production the runtime is initialized by the generated federation
		// bootstrap before any component mounts, so the try path is never hit.
		const remoteName = MFE_REMOTES[mfe];
		try {
			loadRemote<AppModule>(remoteName)
				.then(remote => {
					if (!remote?.default) {
						return;
					}
					mountApp(remote.default);
				})
				.catch(console.error);
		} catch {
			// MF runtime not ready (dev mode without devLoader). SSR fragment HTML stays in place.
		}
		// mfe/devLoader are fixed per render; mfeData intentionally excluded —
		// re-mounting on data change would tear down and recreate the React root.
		// oxlint-disable-next-line react-hooks/exhaustive-deps -- caller-controlled deps, static mfe
	}, [mfe, devLoader]);

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

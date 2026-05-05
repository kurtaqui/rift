import { loadRemote } from "@module-federation/runtime";
import { useMemo, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

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
	devLoader?: () => Promise<AppModule>;
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
 *   Loads the MFE's `./app` entry via Module Federation and calls `createRoot` on the
 *   same container. The App component receives `data` (identical to SSR data) and
 *   `basePath` (the shell prefix) so its MemoryRouter picks the right child route.
 *
 * Local dev (MFE_SSR_MODE=local):
 *   `mfeHtml` is `null`. The container starts empty and React fills it after the
 *   remote is loaded.
 */
export function MfeSlot({ mfe, mfeHtml, mfeData, devLoader }: MfeSlotProps): React.JSX.Element {
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

		// Create an imperatively-managed mount point that is NOT a React-managed
		// element. React 19 forbids calling createRoot on a node that React itself
		// created with dangerouslySetInnerHTML. By creating the node via the DOM
		// API we bypass that restriction while still replacing the SSR HTML cleanly.
		const wrapper = wrapperRef.current;
		const mountPoint = document.createElement("div");
		wrapper.innerHTML = "";
		wrapper.append(mountPoint);

		const basePath = MFE_BASE_PATHS[mfe];

		// Dev mode: use the caller-supplied direct Vite import instead of MF.
		// `devLoader` is a `() => import("~mfe/...")` alias resolved by the shell's
		// Vite config — no MF runtime required.
		if (devLoader) {
			devLoader()
				.then(mod => {
					const App = mod.default;
					createRoot(mountPoint).render(<App data={mfeData ?? undefined} basePath={basePath} />);
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
					const App = remote.default;
					createRoot(mountPoint).render(<App data={mfeData ?? undefined} basePath={basePath} />);
				})
				.catch(console.error);
		} catch {
			// MF runtime not ready (dev mode without devLoader). SSR fragment HTML stays in place.
		}
		// mfe/devLoader are fixed per render; mfeData intentionally excluded —
		// re-mounting on data change would tear down and recreate the React root.
		// oxlint-disable-next-line react-hooks/exhaustive-deps -- caller-controlled deps, static mfe
	}, [mfe, devLoader]);

	// suppressHydrationWarning: the inner HTML is foreign to the shell's React
	// tree — React should not validate or manage it during shell hydration.
	// createRoot is NOT called on this element; instead, the useEffect creates an
	// imperative child node as the React root, bypassing the React 19 restriction
	// on mixing dangerouslySetInnerHTML with createRoot on the same node.
	return (
		<div
			ref={wrapperRef}
			// oxlint-disable-next-line react/no-danger -- intentional: embedding MFE SSR fragment HTML
			dangerouslySetInnerHTML={htmlContent}
			suppressHydrationWarning
		/>
	);
}

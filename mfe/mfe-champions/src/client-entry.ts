import { createElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

/**
 * MFE Champions — client bundle entry point.
 *
 * Built by Vite as a standalone ES module (`mfe.js`) served from the MFE
 * server. The shell's `MfeSlot` injects this script at runtime via a
 * `<script type="module">` tag, so the URL is purely runtime-determined —
 * no build-time baking required.
 *
 * Dev:  `vite build --watch --sourcemap` → external `.map` files served
 *       alongside `mfe.js`. DevTools fetches them automatically from the MFE
 *       origin, giving full source-level debugging.
 * Prod: `vite build --minify --sourcemap=hidden` → minified bundle, `.map`
 *       files exist for error-tracker upload but are not linked inline.
 *
 * Registration contract with `MfeSlot`:
 * - Sets `window.__mfe_app__<origin>` to `{ default: App }` so MfeSlot can
 *   call `hydrateRoot` / `createRoot` with the correct component.
 * - Sets `window.__mfe_navigate__<origin>` to a function that drives the
 *   MemoryRouter when Vike SPA-navigates to a different sub-route.
 */
import App from "./App";
import { setNavigate } from "./navigate-bridge";

type MountedRoot = {
	render: (element: React.ReactNode) => void;
};

const ROOTS = new WeakMap<HTMLElement, MountedRoot>();

const origin = new URL(import.meta.url).origin;

// Register a mount function so the shell doesn't render this component with
// its own React runtime (which causes hook/runtime mismatches).
Object.assign(globalThis, {
	[`__mfe_mount__${origin}`]: (
		container: HTMLElement,
		props: {
			data?: unknown;
			route?: string;
			mountPath?: string;
			ssrHtml?: string | null;
			isHydration?: boolean;
		},
	) => {
		const element = createElement(App, {
			data: props.data,
			basePath: props.mountPath,
			route: props.route,
		});

		const existingRoot = ROOTS.get(container);
		if (existingRoot) {
			existingRoot.render(element);
			return;
		}

		if (props.ssrHtml && props.isHydration) {
			const root = hydrateRoot(container, element);
			ROOTS.set(container, root);
			return;
		}
		if (props.ssrHtml) {
			container.innerHTML = "";
		}
		const root = createRoot(container);
		ROOTS.set(container, root);
		root.render(element);
	},
});

// Expose the MemoryRouter navigate function for Vike SPA nav updates.
Object.assign(globalThis, {
	[`__mfe_navigate__${origin}`]: (route: string) => {
		setNavigate(route);
	},
});

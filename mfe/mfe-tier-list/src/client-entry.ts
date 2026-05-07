import { createElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

/**
 * MFE Tier List — client bundle entry point.
 * See mfe-champions/src/client-entry.ts for the full pattern description.
 */
import App from "./App";

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
			ssrHtml?: string | null;
			isHydration?: boolean;
		},
	) => {
		const element = createElement(App, {
			data: props.data,
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

// Tier list has no sub-routes; navigate is a no-op but kept for consistency.
Object.assign(globalThis, { [`__mfe_navigate__${origin}`]: (_route: string) => {} });

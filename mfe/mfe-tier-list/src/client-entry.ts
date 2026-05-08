// TODO: Sync with champions client entry and create reusable utils
import { QueryClient, QueryClientProvider, hydrate as hydrateQuery } from "@tanstack/react-query";
import { createElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

import App from "./App";

type MountedRoot = {
	render: (element: React.ReactNode) => void;
};

const ROOTS = new WeakMap<HTMLElement, MountedRoot>();

const origin = new URL(import.meta.url).origin;

const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: Infinity } },
});

// Register a mount function so the shell doesn't render this component with
// its own React runtime (which causes hook/runtime mismatches).
Object.assign(globalThis, {
	[`__mfe_mount__${origin}`]: (
		container: HTMLElement,
		props: {
			transferState?: unknown;
			route?: string;
			mountPath?: string;
			ssrHtml?: string | null;
			isHydration?: boolean;
		},
	) => {
		if (props.transferState) {
			hydrateQuery(queryClient, props.transferState);
		}

		const element = createElement(
			QueryClientProvider,
			{ client: queryClient },
			createElement(App, {
				...(props.mountPath !== undefined && { basePath: props.mountPath }),
			}),
		);
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
		const root = createRoot(container);
		ROOTS.set(container, root);
		root.render(element);
	},
});

// Tier list has no sub-routes; navigate is a no-op but kept for consistency.
Object.assign(globalThis, {
	[`__mfe_navigate__${origin}`]: (_route: string) => {
		/* empty */
	},
});

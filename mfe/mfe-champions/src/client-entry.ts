import { QueryClient, QueryClientProvider, hydrate as hydrateQuery } from "@tanstack/react-query";
import { createElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

import App from "./App";
import { setNavigate } from "./navigate-bridge";

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
		Object.assign(globalThis, {
			[`__mfe_emit_navigate__${origin}`]: (route: string) => {
				container.dispatchEvent(new CustomEvent("mfe:navigate", { detail: route }));
			},
		});

		const existingRoot = ROOTS.get(container);
		if (existingRoot) {
			// Shell route changes are handled through __mfe_navigate__. Avoid
			// re-rendering the entire root here to prevent duplicate init renders.
			return;
		}

		if (props.transferState) {
			hydrateQuery(queryClient, props.transferState);
		}

		const element = createElement(
			QueryClientProvider,
			{ client: queryClient },
			createElement(App, {
				basePath: props.mountPath,
				mfeOrigin: origin,
				route: props.route,
			} as React.ComponentProps<typeof App>),
		);

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

// Expose the MemoryRouter navigate function for Vike SPA nav updates.
Object.assign(globalThis, {
	[`__mfe_navigate__${origin}`]: (route: string) => {
		setNavigate(route);
	},
});

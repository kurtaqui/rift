import type { Config } from "@stencil/core";
import { reactOutputTarget } from "@stencil/react-output-target";

export const config: Config = {
	namespace: "rift-ui",
	outputTargets: [
		reactOutputTarget({
			outDir: "src/react",
			// `hydrateModule` — Node-side hydrate script used by `@stencil/ssr`
			// Vite plugin and by the generated `components.server.ts` wrappers
			// to serialise Declarative Shadow DOM during SSR.
			//
			// `clientModule` must be the React wrapper (not the raw element
			// class) so that `components.server.ts`'s `clientModule` field
			// references the same React component that CSR hydration uses.
			// `@rift/ui/react` has no `node` export condition, so Node.js
			// resolves it to `components.ts` (the client wrapper) avoiding
			// a circular import.
			clientModule: "@rift/ui/react",
			hydrateModule: "@rift/ui/hydrate",
		}),
		{
			type: "dist",
			esmLoaderPath: "../loader",
		},
		{
			type: "dist-custom-elements",
			customElementsExportBehavior: "auto-define-custom-elements",
			externalRuntime: false,
		},
		{
			type: "dist-hydrate-script",
			dir: "hydrate",
		},
		{
			type: "docs-readme",
		},
		{
			type: "www",
			serviceWorker: null,
		},
	],
};

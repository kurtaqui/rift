import { Config } from "@stencil/core";
import { reactOutputTarget } from "@stencil/react-output-target";

export const config: Config = {
	namespace: "rift-player",
	outputTargets: [
		reactOutputTarget({
			outDir: "src/react",
			hydrateModule: "@rift/mfe-player/hydrate",
			clientModule: "@rift/mfe-player/react",
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
			dir: "./hydrate",
		},
		{
			type: "docs-readme",
		},
	],
};

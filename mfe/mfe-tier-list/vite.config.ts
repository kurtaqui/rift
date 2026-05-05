import { federation } from "@module-federation/vite";
import react from "@vitejs/plugin-react-oxc";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig } from "vite";

/**
 * `mfe-tier-list` serves two roles — see `mfe/mfe-champions/vite.config.ts`
 * for the full architectural notes. Same shape, different name / exposes / port.
 */
export default defineConfig(({ command }) => ({
	base: command === "build" ? (process.env.MFE_TIER_LIST_PUBLIC_PATH ?? "/static-assets/mfes/mfe-tier-list/") : "/",
	plugins: [
		...(command !== "build" ? [vike()] : []),
		react(),
		...(command === "build"
			? [
					federation({
						name: "mfe-tier-list",
						filename: "remoteEntry.js",
						exposes: {
							"./app": "./src/App.tsx",
						},
						shared: {
							react: { singleton: true, requiredVersion: "^19.0.0" },
							"react/": {},
							"react-dom": { singleton: true, requiredVersion: "^19.0.0" },
							"react-dom/": {},
							vike: { singleton: true },
							"vike-react": { singleton: true },
							jotai: { singleton: true },
						},
						manifest: true,
						// `@module-federation/dts-plugin` peer-requires TS ^4–5 (we run TS 6) and
						// runs a `tsc` over `exposes` whose path-alias imports cause `.d.ts`
						// files to leak into `libs/*/src/`. The shell consumes our pages via
						// the package `exports` map, so MF type sharing is unnecessary.
						dts: false,
					}),
				]
			: []),
	],
	resolve: {
		alias: [
			{ find: "@rift/ui/dist/components", replacement: path.resolve(__dirname, "../../libs/ui/dist/components") },
			{ find: /^@rift\/ui$/, replacement: path.resolve(__dirname, "../../libs/ui/src/index.ts") },
			{ find: "@rift/champion", replacement: path.resolve(__dirname, "../../libs/champion/src/index.ts") },
			{ find: "@rift/data-access", replacement: path.resolve(__dirname, "../../libs/data-access/src/index.ts") },
			{
				find: "@rift/mfe-fragment/renderer",
				replacement: path.resolve(__dirname, "../../libs/mfe-fragment/src/renderer.ts"),
			},
			{
				find: "@rift/mfe-fragment/server",
				replacement: path.resolve(__dirname, "../../libs/mfe-fragment/src/server.ts"),
			},
			{
				find: "@rift/mfe-fragment/client",
				replacement: path.resolve(__dirname, "../../libs/mfe-fragment/src/client.tsx"),
			},
			// vike-react@0.6.21 local install omits getPageElement from its exports map;
			// alias directly to the file so Vite can resolve it.
			{
				find: "vike-react/__internal/integration/getPageElement",
				replacement: path.resolve(__dirname, "node_modules/vike-react/dist/integration/getPageElement.js"),
			},
		],
	},
	build: {
		target: "esnext",
		minify: true,
		cssCodeSplit: false,
	},
	server: {
		port: 3012,
		strictPort: true,
		origin: process.env.MFE_TIER_LIST_URL ?? "http://localhost:3012",
	},
	preview: {
		port: 3012,
		strictPort: true,
	},
}));

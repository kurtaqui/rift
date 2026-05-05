import { federation } from "@module-federation/vite";
import react from "@vitejs/plugin-react-oxc";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig } from "vite";

/**
 * `mfe-champions` serves two roles:
 *
 * 1. **Fragment server** (dev + prod SSR): `vike dev` starts a Hono+Vike server
 *    (`+server.ts`) that accepts `GET /fragment?url=<path>` calls from the shell
 *    and returns `{ html, data }` JSON. `vike()` is included for this purpose.
 *
 * 2. **Module Federation remote** (prod build only): `vite build` emits
 *    `remoteEntry.js` + page chunks so the shell's client-side MF runtime can
 *    lazy-load champion pages. `federation()` is gated to build-only so it
 *    doesn't interfere with Vike's dev server.
 *
 * Base URL:
 *   - Dev (fragment serving): `/` — required so Vike accepts arbitrary path requests.
 *   - Build (MF remote): `/static-assets/mfes/mfe-champions/` (or CDN via env).
 */
export default defineConfig(({ command }) => ({
	base: command === "build" ? (process.env.MFE_CHAMPIONS_PUBLIC_PATH ?? "/static-assets/mfes/mfe-champions/") : "/",
	plugins: [
		// Vike plugin enables `renderPage` and `+server.ts` for fragment serving.
		// Gated to dev to avoid conflicting with the MF remote build output.
		...(command !== "build" ? [vike()] : []),
		react(),
		// Federation remote bundle — build only.
		...(command === "build"
			? [
					federation({
						name: "mfe-champions",
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
		// Most-specific subpath aliases must come before the base package alias.
		alias: [
			{ find: "@rift/ui/dist/components", replacement: path.resolve(__dirname, "../../libs/ui/dist/components") },
			{ find: /^@rift\/ui$/, replacement: path.resolve(__dirname, "../../libs/ui/src/index.ts") },
			{ find: "@rift/champion", replacement: path.resolve(__dirname, "../../libs/champion/src/index.ts") },
			{ find: "@rift/data-access", replacement: path.resolve(__dirname, "../../libs/data-access/src/index.ts") },
			// Source aliases for @rift/mfe-fragment subpath exports so the fragment
			// server works without needing a pre-built `dist/` from the lib.
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
			// todo: check hack
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
		port: 3011,
		strictPort: true,
		origin: process.env.MFE_CHAMPIONS_URL ?? "http://localhost:3011",
	},
	preview: {
		port: 3011,
		strictPort: true,
	},
}));

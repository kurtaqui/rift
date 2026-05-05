import { federation } from "@module-federation/vite";
import react from "@vitejs/plugin-react-oxc";
import path from "node:path";
import { defineConfig } from "vite";

/**
 * `mfe-tier-list` is a Module Federation **remote** (Phase D-A). See
 * `mfe/mfe-champions/vite.config.ts` for the architectural notes — this
 * file is the same shape with a different `name` / `exposes`.
 */
export default defineConfig({
	// See `mfe/mfe-champions/vite.config.ts` for the `base` rationale.
	base: process.env.MFE_TIER_LIST_PUBLIC_PATH ?? "/static-assets/mfes/mfe-tier-list/",
	plugins: [
		react(),
		federation({
			name: "mfe-tier-list",
			filename: "remoteEntry.js",
			exposes: {
				"./pages/tier-list": "./src/pages/tier-list/Page.tsx",
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
	],
	resolve: {
		// Most-specific subpath aliases must come before the base package alias.
		alias: [
			{ find: "@rift/ui/dist/components", replacement: path.resolve(__dirname, "../../libs/ui/dist/components") },
			{ find: /^@rift\/ui$/, replacement: path.resolve(__dirname, "../../libs/ui/src/index.ts") },
			{ find: "@rift/champion", replacement: path.resolve(__dirname, "../../libs/champion/src/index.ts") },
			{ find: "@rift/data-access", replacement: path.resolve(__dirname, "../../libs/data-access/src/index.ts") },
		],
	},
	build: {
		target: "esnext",
		minify: true,
		cssCodeSplit: false,
	},
	server: {
		// See `apps/mfe-champions/vite.config.ts` — primary preview is
		// `pnpm mfes:serve` on :3010; this port is the standalone smoke test.
		port: 3012,
		strictPort: true,
		origin: process.env.MFE_TIER_LIST_URL ?? "http://localhost:3012",
	},
	preview: {
		port: 3012,
		strictPort: true,
	},
});

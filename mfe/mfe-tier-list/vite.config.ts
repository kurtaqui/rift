import { federation } from "@module-federation/vite";
import react from "@vitejs/plugin-react-oxc";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig, loadEnv } from "vite";

/**
 * `mfe-tier-list` serves two roles — see `mfe/mfe-champions/vite.config.ts`
 * for the full architectural notes. Same shape, different name / exposes / port.
 */
export default defineConfig(({ command, mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	function requireEnv(key: string): string {
		const value = env[key];
		if (!value) {
			throw new Error(`Missing required environment variable: ${key}`);
		}
		return value;
	}

	return {
		// See `apps/mfe-champions/vite.config.ts` for the `base` rationale.
		// In dev, Vike needs `base: "/"` to accept arbitrary path requests.
		base: command === "serve" ? "/" : requireEnv("MFE_TIER_LIST_PUBLIC_PATH"),
		plugins: [
			// Always active: drives the Vike dev server and SSR fragment handler.
			vike(),
			react(),
			// Gated to the `client` environment — see mfe-champions for rationale.
			...federation({
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
			}).map(p => ({
				...p,
				applyToEnvironment: (env: { name: string }) => env.name === "client",
			})),
		],
		resolve: {
			// Most-specific subpath aliases must come before the base package alias.
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
			// See `apps/mfe-champions/vite.config.ts` — primary preview is
			// `pnpm mfes:serve` on :3010; this port is the standalone smoke test.
			port: 3012,
			strictPort: true,
			origin: requireEnv("MFE_TIER_LIST_URL"),
			// Allow cross-origin requests from the shell (`:3000`) in isolated
			// dev mode (VITE_MFE_ISOLATED=true).
			cors: true,
		},
		preview: {
			port: 3012,
			strictPort: true,
		},
	};
});

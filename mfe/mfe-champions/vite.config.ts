import { federation } from "@module-federation/vite";
import react from "@vitejs/plugin-react-oxc";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig, loadEnv } from "vite";

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
		// `base` becomes the runtime `publicPath` for the built `remoteEntry.js`
		// and asset chunks. The shell mounts each MFE's `dist/` under
		// `/static-assets/mfes/<name>/*` (see `apps/shell/server/hono.ts`), so
		// chunk URLs resolve against the shell's own origin in both preview
		// and prod — no separate static host or CORS required. Override via
		// `MFE_CHAMPIONS_PUBLIC_PATH` for prod CDNs.
		// In dev, Vike needs `base: "/"` to accept arbitrary path requests from
		// the shell's fragment fetcher (`GET /fragment?url=<path>`).
		base: command === "serve" ? "/" : requireEnv("MFE_CHAMPIONS_PUBLIC_PATH"),
		plugins: [
			// Always active: drives the Vike dev server and SSR fragment handler
			// (`GET /fragment?url=...`) in both dev and the SSR build.
			vike(),
			react(),
			// `federation()` is gated to the `client` Vite environment so it never
			// stomps on Vike's SSR environment. In dev this lets Vike serve
			// `/fragment` requests cleanly while the MF remote (`remoteEntry.js`)
			// is available on the client dev environment. In the prod build the
			// same guard keeps the SSR bundle free of MF virtual modules.
			...federation({
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
			}).map((p) => ({
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
			// `vite dev` is rarely useful for an MFE remote (the shell consumes
			// the source via workspace alias for HMR); `vite preview` is a smoke
			// test for the built `remoteEntry.js`. The primary preview path is
			// the unified static host: `pnpm mfes:serve` (see
			// `scripts/serve-mfes.mjs`) which serves both MFEs from `:3010`.
			port: 3011,
			strictPort: true,
			origin: requireEnv("MFE_CHAMPIONS_URL"),
		},
		preview: {
			port: 3011,
			strictPort: true,
		},
	};
});

import { federation } from "@module-federation/vite";
import { stencilSSR } from "@stencil/ssr";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";

/**
 * Bare-name → workspace source map for MFE pages, used by SSR (and dev
 * fallback). The client production build lets `@module-federation/vite`
 * intercept these specifiers via `loadRemote(...)` instead — see the
 * federation plugin block below and `mfeBareNameAliasPlugin`.
 */
const MFE_BARE_NAME_TARGETS: Record<string, string> = {
	"mfe-champions/pages/champions-list": path.resolve(
		__dirname,
		"../../mfe/mfe-champions/src/pages/champions-list/Page.tsx",
	),
	"mfe-champions/pages/champions-list/data": path.resolve(
		__dirname,
		"../../mfe/mfe-champions/src/pages/champions-list/data.ts",
	),
	"mfe-champions/pages/champion-detail": path.resolve(
		__dirname,
		"../../mfe/mfe-champions/src/pages/champion-detail/Page.tsx",
	),
	"mfe-champions/pages/champion-detail/data": path.resolve(
		__dirname,
		"../../mfe/mfe-champions/src/pages/champion-detail/data.ts",
	),
	"mfe-tier-list/pages/tier-list": path.resolve(__dirname, "../../mfe/mfe-tier-list/src/pages/tier-list/Page.tsx"),
	"mfe-tier-list/pages/tier-list/data": path.resolve(__dirname, "../../mfe/mfe-tier-list/src/pages/tier-list/data.ts"),
};

/**
 * D-A.5 — resolves the bare-name MFE specifiers (e.g.
 * `mfe-champions/pages/champions-list`) used by the shell's `+Page.tsx`
 * and `+data.ts` files.
 *
 * Active for every non-client environment (SSR, server, etc.). The
 * federation host plugin owns bare-name specifiers in the `client`
 * environment — both in dev and in the production build — rewriting
 * them into `loadRemote(...)` calls at runtime. Non-client environments
 * (Vike SSR, +data, +title) still need the alias to resolve directly
 * to the MFE source tree so SSR keeps working without the MF runtime.
 */
function makeMfeBareNameAliasPlugin(): Plugin {
	return {
		name: "rift:mfe-bare-name-alias",
		enforce: "pre" as const,
		applyToEnvironment: (viteEnv: { name: string }) => viteEnv.name !== "client",
		resolveId(source: string) {
			return MFE_BARE_NAME_TARGETS[source];
		},
	};
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	function requireEnv(key: string): string {
		const value = env[key];
		if (!value) {
			throw new Error(`Missing required environment variable: ${key}`);
		}
		return value;
	}

	const MFE_CHAMPIONS_URL = requireEnv("MFE_CHAMPIONS_URL");
	const MFE_TIER_LIST_URL = requireEnv("MFE_TIER_LIST_URL");
	const RIFT_API_URL = requireEnv("RIFT_API_URL");

	// `MFE_*_CLIENT_URL` separates the client-side MF manifest URL from the
	// server-side fragment URL. Useful in build-watch mode where MFE JS chunks
	// are served by the shell itself rather than the MFE Vite dev server.
	// Defaults to the fragment URL so regular dev requires no extra config.
	const MFE_CHAMPIONS_CLIENT_URL = env["MFE_CHAMPIONS_CLIENT_URL"] ?? MFE_CHAMPIONS_URL;
	const MFE_TIER_LIST_CLIENT_URL = env["MFE_TIER_LIST_CLIENT_URL"] ?? MFE_TIER_LIST_URL;

	return {
		plugins: [
			vike(),
			react(),
			tailwindcss(),
			makeMfeBareNameAliasPlugin(),
			// Compile-time SSR for the Stencil player MFE. The plugin intercepts JSX
			// that references components from `@rift/mfe-player/react`, calls the
			// hydrate module, and replaces them with pre-rendered Declarative
			// Shadow-DOM wrappers so the markup is server-rendered.
			stencilSSR({
				module: import("@rift/mfe-player/react"),
				from: "@rift/mfe-player/react",
				hydrateModule: import("@rift/mfe-player/hydrate"),
				serializeShadowRoot: { default: "declarative-shadow-dom" },
			}),
			// Federation host plugin — scoped to the `client` Vite environment
			// in both dev and build (D-A.5 updated):
			// - Client env (dev + build): MF intercepts bare-name specifiers and
			//   rewrites them into `loadRemote(...)` calls. Shared singletons
			//   (react, react-dom, jotai) are negotiated via the MF runtime so
			//   both the shell and each remote use the same instance.
			// - SSR / server envs: the `mfeBareNameAliasPlugin` above resolves
			//   bare names directly to the MFE source tree (no MF runtime on
			//   the server). Vike's +data / +title hooks stay server-rendered.
			// `applyToEnvironment` confines every emitted sub-plugin to the
			// `client` env, preventing the plugin from touching Vike's SSR entry
			// and avoiding the "Default export from undefined" error.
			...federation({
				name: "shell",
				// Remotes are referenced as `<name>@<manifest-url>`. The plugin
				// fetches each `mf-manifest.json` at build time to know what's
				// exposed and at runtime to load chunks.
				remotes: {
					"mfe-champions": {
						type: "module",
						name: "mfe-champions",
						entry: `${MFE_CHAMPIONS_CLIENT_URL}/mf-manifest.json`,
					},
					"mfe-tier-list": {
						type: "module",
						name: "mfe-tier-list",
						entry: `${MFE_TIER_LIST_CLIENT_URL}/mf-manifest.json`,
					},
				},
				shared: {
					react: { singleton: true, requiredVersion: "^19.0.0" },
					"react/": {},
					"react-dom": { singleton: true, requiredVersion: "^19.0.0" },
					"react-dom/": {},
					jotai: { singleton: true },
					// NOTE: do NOT add `vike` / `vike-react` here. The MF plugin
					// rewrites every `shared` import to a virtual module, which
					// replaces the Vike runtime entry's manifest id
					// (`@@vike/dist/client/runtime-client-routing/entry.js`) with
					// `node_modules/__mf__virtual/...vike__loadShare__.mjs`. Vike's
					// production server then fails to look up its own entry and
					// every route 500s with "You stumbled upon a Vike bug" in
					// `getManifestEntry`. Vike is the host framework, not a
					// remote-shared dep — let each MFE bundle its own copy.
				},
				// See note in MFE configs: peer-version mismatch with TS 6.
				dts: false,
			}).map(p => ({
				...p,
				applyToEnvironment: (viteEnv: { name: string }) => viteEnv.name === "client",
			})),
		],
		define: {
			// Bridge MFE client URLs into the bundle for the dev-mode MF init()
			// in libs/mfe-fragment/src/client.tsx. Dead code in prod builds.
			"import.meta.env.VITE_MFE_CHAMPIONS_URL": JSON.stringify(MFE_CHAMPIONS_CLIENT_URL),
			"import.meta.env.VITE_MFE_TIER_LIST_URL": JSON.stringify(MFE_TIER_LIST_CLIENT_URL),
		},
		server: {
			proxy: {
				// In dev, browser fetches to `/api/*` are proxied to apps/api on :3100
				// (with the `/api` prefix stripped). The regex uses a negative
				// lookahead so `/api/auth/**` is NOT matched here — those routes
				// must reach the shell's own Hono server (`authjsHandler`) so the
				// CSRF cookie set by `GET /api/auth/csrf` is read back by the
				// callback POST on the same origin/handler.
				"^/api/(?!auth(/|$)).*": {
					target: RIFT_API_URL,
					changeOrigin: true,
					rewrite: p => p.replace(/^\/api/, ""),
				},
			},
		},
		resolve: {
			// Most-specific subpath aliases must come before the base package alias.
			alias: [
				{ find: "@rift/ui/dist/components", replacement: path.resolve(__dirname, "../../libs/ui/dist/components") },
				{ find: /^@rift\/ui$/, replacement: path.resolve(__dirname, "../../libs/ui/src/index.ts") },
				{
					find: "@rift/mfe-player/react",
					replacement: path.resolve(__dirname, "../../mfe/mfe-player/src/react/components.ts"),
				},
				{
					find: "@rift/mfe-player/hydrate",
					replacement: path.resolve(__dirname, "../../mfe/mfe-player/hydrate/index.mjs"),
				},
				{
					find: "@rift/mfe-player/loader",
					replacement: path.resolve(__dirname, "../../mfe/mfe-player/loader/index.js"),
				},
				{
					find: "@rift/mfe-player/dist/components",
					replacement: path.resolve(__dirname, "../../mfe/mfe-player/dist/components"),
				},
				{
					find: "@rift/mfe-player",
					replacement: path.resolve(__dirname, "../../mfe/mfe-player/dist/index.js"),
				},
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
				{ find: "@rift/champion", replacement: path.resolve(__dirname, "../../libs/champion/src/index.ts") },
				{ find: "@rift/data-access", replacement: path.resolve(__dirname, "../../libs/data-access/src/index.ts") },
				{ find: "@", replacement: path.resolve(__dirname, "./src") },
			],
		},
		optimizeDeps: {
			exclude: [
				"@rift/ui",
				"@rift/champion",
				"@rift/data-access",
				"@rift/mfe-champions",
				"@rift/mfe-player",
				"@rift/mfe-tier-list",
			],
		},
		ssr: {
			noExternal: [
				"@rift/ui",
				"@rift/champion",
				"@rift/data-access",
				"@rift/mfe-champions",
				"@rift/mfe-player",
				"@rift/mfe-tier-list",
				"@stencil/react-output-target",
			],
		},
	};
});

import { federation } from "@module-federation/vite";
import { stencilSSR } from "@stencil/ssr";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig } from "vite";

/**
 * Default URLs for the horizontal MFE remotes. The shell's Hono server
 * mounts each MFE's `dist/` under `/static-assets/mfes/<name>/*` (see
 * `apps/shell/server/hono.ts`), so the federation runtime fetches the
 * manifest and chunks from the shell's own origin — no extra static
 * host or CORS configuration. In CI/prod each remote can be deployed
 * to a CDN and its URL supplied via env.
 */
const MFE_CHAMPIONS_URL = process.env.MFE_CHAMPIONS_URL ?? "/static-assets/mfes/mfe-champions";
const MFE_TIER_LIST_URL = process.env.MFE_TIER_LIST_URL ?? "/static-assets/mfes/mfe-tier-list";

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
 * Active everywhere **except the client production build**, where the
 * federation host plugin owns these specifiers and rewrites them into
 * `loadRemote(...)` calls. In dev (`vite dev`) and in the SSR build the
 * federation plugin is disabled, so the alias must apply on every
 * environment — otherwise the client dev graph has no resolver for the
 * bare names and Vike's page-entry virtual module fails to load.
 *
 * Vike uses Vite's environments API which defeats `isSsrBuild`, so we
 * gate the disable via `applyToEnvironment` + `command` here and on the
 * federation plugin below.
 */
function makeMfeBareNameAliasPlugin(command: "serve" | "build") {
	return {
		name: "rift:mfe-bare-name-alias",
		enforce: "pre" as const,
		applyToEnvironment: (env: { name: string }) => command !== "build" || env.name !== "client",
		resolveId(source: string) {
			return MFE_BARE_NAME_TARGETS[source];
		},
	};
}

export default defineConfig(({ command }) => ({
	plugins: [
		vike(),
		react(),
		tailwindcss(),
		makeMfeBareNameAliasPlugin(command),
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
		// Federation host registration is **client-build only** (D-A.5):
		// - In dev (`vite dev`), the plugin is off; bare-name imports like
		//   `import("mfe-champions/pages/...")` resolve via the
		//   `mfe-champions` aliases below to the MFE source tree, so HMR
		//   works without the MFE static host running.
		// - In the SSR build, the plugin is also off (so SSR keeps using the
		//   workspace source via the same aliases). This avoids loading MF
		//   runtime on the server and keeps Vike's `+data` / `+title` hooks
		//   server-rendered against the MFE module directly.
		// - Only in the **client** production build do bare-name imports get
		//   rewritten into `loadRemote(...)` calls that fetch the chunk from
		//   the remote's `mf-manifest.json` at runtime.
		// Loading the plugin in dev or SSR breaks Vike ("Default export from
		// undefined must include a { fetch() } function").
		//
		// Vike uses Vite's environments API and runs the SSR + client builds
		// from a single `vite build` invocation, so `isSsrBuild` is not a
		// reliable per-environment signal. We gate the plugin to `command
		// === "build"` here and use Vite's per-plugin `applyToEnvironment`
		// hook below to confine each emitted plugin to the `client` env.
		...(command === "build"
			? federation({
					name: "shell",
					// Remotes are referenced as `<name>@<manifest-url>`. The plugin
					// fetches each `mf-manifest.json` at build time to know what's
					// exposed and at runtime to load chunks.
					remotes: {
						"mfe-champions": {
							type: "module",
							name: "mfe-champions",
							entry: `${MFE_CHAMPIONS_URL}/mf-manifest.json`,
						},
						"mfe-tier-list": {
							type: "module",
							name: "mfe-tier-list",
							entry: `${MFE_TIER_LIST_URL}/mf-manifest.json`,
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
					applyToEnvironment: env => env.name === "client",
				}))
			: []),
	],
	server: {
		proxy: {
			// In dev, browser fetches to `/api/*` are proxied to apps/api on :3100
			// (with the `/api` prefix stripped). The regex uses a negative
			// lookahead so `/api/auth/**` is NOT matched here — those routes
			// must reach the shell's own Hono server (`authjsHandler`) so the
			// CSRF cookie set by `GET /api/auth/csrf` is read back by the
			// callback POST on the same origin/handler.
			"^/api/(?!auth(/|$)).*": {
				target: process.env.RIFT_API_URL ?? "http://localhost:3100",
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
}));

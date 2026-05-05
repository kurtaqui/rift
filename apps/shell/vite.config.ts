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

export default defineConfig(({ command }) => ({
	plugins: [
		vike(),
		react(),
		tailwindcss(),
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
		// Federation host registration is **client-build only**.
		// MFE SSR is now handled by runtime HTTP fragment composition
		// (fetchMfeFragment → MFE fragment servers) so the bare-name alias
		// plugin is no longer needed and the federation plugin is only
		// required to wire up client-side Module Federation remotes.
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
			// Dev-mode direct imports for MFE Apps — used by shell +Page.tsx files
			// as `devLoader` props so client-side React mounts without MF runtime.
			// These aliases are only active during `vite dev` (the federation plugin
			// that provides `loadRemote` is gated to `command === "build"`).
			{
				find: "~mfe/champions",
				replacement: path.resolve(__dirname, "../../mfe/mfe-champions/src/App.tsx"),
			},
			{
				find: "~mfe/tier-list",
				replacement: path.resolve(__dirname, "../../mfe/mfe-tier-list/src/App.tsx"),
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

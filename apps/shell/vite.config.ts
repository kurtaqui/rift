import { stencilSSR } from "@stencil/ssr";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	function requireEnv(key: string): string {
		const value = env[key];
		if (!value) throw new Error(`Missing required environment variable: ${key}`);
		return value;
	}

	const RIFT_API_URL = requireEnv("RIFT_API_URL");

	return {
		plugins: [
			vike(),
			react(),
			tailwindcss(),
			// Compile-time SSR for the Stencil player MFE. The plugin intercepts
			// JSX referencing `@rift/mfe-player/react`, calls the hydrate module,
			// and replaces them with pre-rendered Declarative Shadow-DOM wrappers.
			stencilSSR({
				module: import("@rift/mfe-player/react"),
				from: "@rift/mfe-player/react",
				hydrateModule: import("@rift/mfe-player/hydrate"),
				serializeShadowRoot: { default: "declarative-shadow-dom" },
			}),
		],
		server: {
			proxy: {
				// `/api/*` → apps/api on :3100. Carve-out for `/api/auth/**` so Auth.js
				// CSRF cookies stay on the same origin as the shell.
				"^/api/(?!auth(/|$)).*": {
					target: RIFT_API_URL,
					changeOrigin: true,
					rewrite: (p: string) => p.replace(/^\/api/, ""),
				},
			},
		},
		resolve: {
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
				{ find: "@rift/mfe-player", replacement: path.resolve(__dirname, "../../mfe/mfe-player/dist/index.js") },
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
			exclude: ["@rift/ui", "@rift/champion", "@rift/data-access", "@rift/mfe-player"],
		},
		ssr: {
			noExternal: [
				"@rift/ui",
				"@rift/champion",
				"@rift/data-access",
				"@rift/mfe-player",
				"@stencil/react-output-target",
			],
		},
	};
});

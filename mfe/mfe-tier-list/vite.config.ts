import react from "@vitejs/plugin-react-oxc";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig } from "vite";

/**
 * `mfe-tier-list` — same architecture as `mfe-champions`.
 * SSR fragment server on :3012 + standalone client bundle (`mfe.js`).
 * See `mfe-champions/vite.config.ts` for the full description.
 */
export default defineConfig({
	base: "/",
	plugins: [vike(), react()],
	resolve: {
		// Prevent multiple React copies on cold Vite start. When the MFE script is
		// injected cross-origin, Vite may lazily optimise react-dom/client and
		// @tanstack/react-query with different internal React references. dedupe
		// forces a single resolution within this server's module graph.
		dedupe: ["react", "react-dom", "react-dom/client"],
		alias: [
			{ find: "@rift/ui/dist/components", replacement: path.resolve(__dirname, "../../libs/ui/dist/components") },
			{ find: /^@rift\/ui$/, replacement: path.resolve(__dirname, "../../libs/ui/src/index.ts") },
			{ find: "@rift/champion", replacement: path.resolve(__dirname, "../../libs/champion/src/index.ts") },
			{ find: "@rift/data-access", replacement: path.resolve(__dirname, "../../libs/data-access/src/index.ts") },
			{
				find: "@rift/mfe-fragment/server",
				replacement: path.resolve(__dirname, "../../libs/mfe-fragment/src/server.ts"),
			},
			{
				find: "@rift/mfe-fragment/client",
				replacement: path.resolve(__dirname, "../../libs/mfe-fragment/src/client.tsx"),
			},
		],
	},
	optimizeDeps: {
		// Eagerly pre-bundle React and react-query on server start so they are
		// ready before the first cross-origin script request arrives. Lazy
		// (on-demand) bundling can produce mismatched React instances because
		// react-dom/client and @tanstack/react-query may receive React from
		// different optimisation passes.
		include: ["react", "react-dom", "react-dom/client", "@tanstack/react-query"],
	},
	build: {
		target: "esnext",
		minify: true,
		cssCodeSplit: false,
	},
	server: {
		port: 3012,
		strictPort: true,
		cors: true,
	},
	preview: {
		port: 3012,
		strictPort: true,
	},
});

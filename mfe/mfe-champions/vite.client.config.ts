import react from "@vitejs/plugin-react-oxc";
import path from "node:path";
import { defineConfig } from "vite";

/**
 * Vite config for building the standalone MFE client bundle (`mfe.js`).
 *
 * This is a library-style build — no Vike, no SSR. The output is a single
 * ES module that the shell loads at runtime via `<script type="module">`.
 *
 * Dev (watch + sourcemaps):
 *   vite build --config vite.client.config.ts --watch --sourcemap
 *
 * Prod (minified, hidden maps):
 *   vite build --config vite.client.config.ts --minify --sourcemap=hidden
 */
export default defineConfig({
	base: "/",
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
	plugins: [react()],
	resolve: {
		alias: [
			{ find: "@rift/ui/dist/components", replacement: path.resolve(__dirname, "../../libs/ui/dist/components") },
			{ find: /^@rift\/ui$/, replacement: path.resolve(__dirname, "../../libs/ui/src/index.ts") },
			{ find: "@rift/champion", replacement: path.resolve(__dirname, "../../libs/champion/src/index.ts") },
			{ find: "@rift/data-access", replacement: path.resolve(__dirname, "../../libs/data-access/src/index.ts") },
		],
	},
	build: {
		target: "esnext",
		lib: {
			entry: path.resolve(__dirname, "src/client-entry.ts"),
			formats: ["es"],
			fileName: () => "mfe.js",
		},
		outDir: "dist/mfe-bundle",
		emptyOutDir: false,
		// Do not externalise React — this is a self-contained bundle.
		rolldownOptions: {
			external: [],
		},
	},
	// Dev server only needed when running `--watch` in isolation.
	server: {
		port: 3011,
		strictPort: true,
		cors: true,
	},
});

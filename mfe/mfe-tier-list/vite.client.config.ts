import react from "@vitejs/plugin-react-oxc";
import path from "node:path";
import { defineConfig } from "vite";

/**
 * Vite config for building the mfe-tier-list standalone client bundle (`mfe.js`).
 * See `mfe-champions/vite.client.config.ts` for the full description.
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
		rolldownOptions: {
			external: [],
		},
	},
	server: {
		port: 3012,
		strictPort: true,
		cors: true,
	},
});

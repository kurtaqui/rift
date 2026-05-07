import react from "@vitejs/plugin-react-oxc";
import path from "node:path";
import vike from "vike/plugin";
import { defineConfig } from "vite";

/**
 * `mfe-champions` serves two purposes:
 *
 * 1. **SSR fragment server** (dev + prod): `+server.ts` exposes
 *    `GET /fragment?route=<path>` which the shell calls server-side.
 *    Vike still runs for standalone dev browsing at `http://localhost:3011`.
 *
 * 2. **Client bundle** (`mfe.js`): a self-contained React app mounted by the
 *    shell's `<MfeSlot>` at runtime via a `<script type="module">` tag.
 *    The bundle is built separately — see the `build:client` NX target.
 *
 *    Dev:  `vite build --watch --sourcemap` — external `.map` files served
 *          alongside `mfe.js`; DevTools resolves them from the MFE origin.
 *    Prod: `vite build --minify --sourcemap=hidden` — minified, maps hidden.
 */
export default defineConfig({
	base: "/",
	plugins: [vike(), react()],
	resolve: {
		alias: [
			{ find: "@rift/ui/dist/components", replacement: path.resolve(__dirname, "../../libs/ui/dist/components") },
			{ find: /^@rift\/ui$/, replacement: path.resolve(__dirname, "../../libs/ui/src/index.ts") },
			{ find: "@rift/champion", replacement: path.resolve(__dirname, "../../libs/champion/src/index.ts") },
			{ find: "@rift/data-access", replacement: path.resolve(__dirname, "../../libs/data-access/src/index.ts") },
			{ find: "@rift/mfe-fragment/server", replacement: path.resolve(__dirname, "../../libs/mfe-fragment/src/server.ts") },
			{ find: "@rift/mfe-fragment/client", replacement: path.resolve(__dirname, "../../libs/mfe-fragment/src/client.tsx") },
		],
	},
	build: {
		target: "esnext",
		minify: true,
		cssCodeSplit: false,
	},
	server: {
		port: 3011,
		strictPort: true,
		cors: true,
	},
	preview: {
		port: 3011,
		strictPort: true,
	},
});

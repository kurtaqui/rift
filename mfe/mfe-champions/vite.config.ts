import { federation } from "@module-federation/vite";
import react from "@vitejs/plugin-react-oxc";
import path from "node:path";
import { defineConfig } from "vite";

/**
 * `mfe-champions` is a Module Federation **remote** (Phase D-A). It is not a
 * standalone Vike app — it only emits `remoteEntry.js` plus the chunks for
 * the page modules listed under `exposes`. The shell loads these on the
 * client at runtime; SSR continues to import the same modules in-tree via
 * the package `exports` map (see `package.json`).
 *
 * Dev story: shell (`vite dev`) imports the page modules through the
 * workspace `@rift/mfe-champions/...` aliases, so HMR works exactly like a
 * normal monorepo. The remote build is only needed for `pnpm preview` /
 * production deploys.
 */
export default defineConfig({
	// `base` becomes the runtime `publicPath` for the built `remoteEntry.js`
	// and asset chunks. The shell mounts each MFE's `dist/` under
	// `/static-assets/mfes/<name>/*` (see `apps/shell/server/hono.ts`), so
	// chunk URLs resolve against the shell's own origin in both preview
	// and prod — no separate static host or CORS required. Override via
	// `MFE_CHAMPIONS_PUBLIC_PATH` for prod CDNs.
	base: process.env.MFE_CHAMPIONS_PUBLIC_PATH ?? "/static-assets/mfes/mfe-champions/",
	plugins: [
		react(),
		federation({
			name: "mfe-champions",
			filename: "remoteEntry.js",
			exposes: {
				"./pages/champions-list": "./src/pages/champions-list/Page.tsx",
				"./pages/champion-detail": "./src/pages/champion-detail/Page.tsx",
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
		}),
	],
	resolve: {
		// Most-specific subpath aliases must come before the base package alias.
		alias: [
			{ find: "@rift/ui/dist/components", replacement: path.resolve(__dirname, "../../libs/ui/dist/components") },
			{ find: /^@rift\/ui$/, replacement: path.resolve(__dirname, "../../libs/ui/src/index.ts") },
			{ find: "@rift/champion", replacement: path.resolve(__dirname, "../../libs/champion/src/index.ts") },
			{ find: "@rift/data-access", replacement: path.resolve(__dirname, "../../libs/data-access/src/index.ts") },
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
		origin: process.env.MFE_CHAMPIONS_URL ?? "http://localhost:3011",
	},
	preview: {
		port: 3011,
		strictPort: true,
	},
});

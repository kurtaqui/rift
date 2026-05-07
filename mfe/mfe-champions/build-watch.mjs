/**
 * build-watch.mjs
 * Runs the MFE client bundle (`mfe.js`) in watch + sourcemap mode using the
 * Vite JS API, so incremental rebuilds work during shell development.
 *
 * Uses `vite.client.config.ts` — no Vike plugin, pure React library build.
 * Source maps are served alongside `mfe.js` from the same origin so DevTools
 * resolves them automatically without any shell-side configuration.
 */
import { build } from "vite";
import path from "node:path";

const __dirname = import.meta.dirname;

await build({
  root: __dirname,
  configFile: path.resolve(__dirname, "vite.client.config.ts"),
  build: { watch: {}, sourcemap: true },
  logLevel: "info",
});

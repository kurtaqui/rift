/**
 * build-watch.mjs
 * Runs vite build in watch mode for mfe-tier-list using the Vite JS API.
 * Bypasses Vike's CLI interception (which rejects --watch as unknown option).
 */
import { build } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = import.meta.dirname;

await build({
  root: __dirname,
  build: { watch: {} },
  logLevel: "info",
});

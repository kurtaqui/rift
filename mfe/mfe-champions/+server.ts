import "dotenv/config";
import vike from "@vikejs/hono";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Server } from "vike/types";

import { renderFragment } from "./src/fragment-renderer";

const __dirname = import.meta.dirname;

const app = new Hono();

/**
 * GET /fragment?route=<mfe-relative-path>
 *
 * Returns `{ html: string, data: unknown }`.
 *
 * Called by the shell's `+data.ts` on every SSR request. The shell renders
 * the returned HTML inside `<MfeSlot>` and passes `data` to the client App
 * for hydration — no comment-marker extraction, no Vike involvement here.
 *
 * Dev:  served alongside Vike's own SSR dev server so standalone browsing
 *       still works. Source maps for the SSR bundle are full and unminified.
 * Prod: Hono server, SSR bundle via `vite build --ssr`.
 */
/**
 * GET /mfe.js — serves the pre-built client bundle for MfeSlot hydration.
 * The bundle is built separately via `vite.client.config.ts`.
 */
app.get("/mfe.js", async c => {
	try {
		const content = await readFile(join(__dirname, "dist/client/mfe.js"), "utf8");
		return new Response(content, {
			headers: {
				"Content-Type": "application/javascript",
				"Cache-Control": "no-cache",
			},
		});
	} catch {
		return c.text("mfe.js not built — run build:client", 404);
	}
});

app.get("/fragment", async c => {
	const route = c.req.query("route") ?? "/";
	const basePath = c.req.query("basePath") ?? "";
	try {
		const result = await renderFragment(route, basePath);
		return c.json(result);
	} catch (error) {
		console.error("[mfe-champions] /fragment error:", error);
		return c.json({ html: null, data: null }, 500);
	}
});

vike(app);

const port = process.env["PORT"] ? Number.parseInt(process.env["PORT"], 10) : 3011;

export default {
	fetch: app.fetch,
	prod: { port },
} satisfies Server;

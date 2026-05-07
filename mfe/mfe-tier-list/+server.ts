// oxlint-disable-next-line import/no-unassigned-import -- dotenv/config must run for side-effect env loading in dev
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
 * Returns `{ html: string, data: unknown }`.
 * Tier list is single-page — route is always `/`.
 */
/**
 * GET /mfe.js — serves the pre-built client bundle for MfeSlot hydration.
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
	try {
		const result = await renderFragment();
		return c.json(result);
	} catch (error) {
		console.error("[mfe-tier-list] /fragment error:", error);
		return c.json({ html: null, data: null }, 500);
	}
});

vike(app);

const port = process.env["PORT"] ? Number.parseInt(process.env["PORT"], 10) : 3012;

export default {
	fetch: app.fetch,
	prod: { port },
} satisfies Server;

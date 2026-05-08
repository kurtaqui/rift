// oxlint-disable-next-line import/no-unassigned-import -- dotenv/config must run for side-effect env loading in dev
import "dotenv/config";
import vike from "@vikejs/hono";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Server } from "vike/types";

import { renderFragment } from "./src/fragment-renderer";

/**
 * Parse the CORS_ORIGINS env var (comma-separated list of allowed origins).
 * Each entry may contain `*` as a wildcard that matches any sequence of non-slash
 * characters within the origin, e.g.:
 *   - `http://localhost:*`  → any localhost port
 *   - `http://*.example.local` → any subdomain of example.local
 *   - `https://shell.example.com` → exact match
 */
const corsPatterns = (process.env["CORS_ORIGINS"] ?? "")
	.split(",")
	.map(s => s.trim())
	.filter(Boolean)
	.map(
		pattern => new RegExp(`^${pattern.replaceAll(/[.+^${}()|[\\]\\\\]/g, String.raw`\$&`).replaceAll("*", "[^/]*")}$`),
	);

function isCorsAllowed(origin: string): boolean {
	return corsPatterns.some(re => re.test(origin));
}

const app = new Hono();

// Set CORS headers BEFORE calling next() so they are included when c.body()
// creates the Response (Response headers are immutable once constructed).
app.use("*", async (c, next) => {
	const origin = c.req.header("Origin") ?? "";
	if (isCorsAllowed(origin)) {
		c.header("Access-Control-Allow-Origin", origin);
		c.header("Vary", "Origin");
	}
	if (c.req.method === "OPTIONS") {
		c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
		c.header("Access-Control-Max-Age", "600");
		return c.body(null, 204);
	}
	return next();
});

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
		const content = await readFile(join(process.cwd(), "dist/mfe-bundle/mfe.js"), "utf8");
		c.header("Content-Type", "application/javascript");
		c.header("Cache-Control", "no-cache");
		return c.body(content);
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

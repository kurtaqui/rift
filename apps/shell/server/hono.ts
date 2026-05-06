import { authjsHandler, authjsSessionMiddleware } from "@rift/auth";
import vike from "@vikejs/hono";
import { Hono } from "hono";
import fs from "node:fs";
import path from "node:path";

import { MFE_CHAMPIONS_DIST, MFE_TIER_LIST_DIST, RIFT_API_URL } from "./env";
import { playerMiddleware } from "./player-middleware";
import { themeMiddleware } from "./theme-middleware";

/**
 * Where each MFE's `dist/` (with `mf-manifest.json`, `remoteEntry.js`
 * and chunk files) lives. Mounted under `/static-assets/mfes/<name>/*`
 * so the federation runtime can fetch them from the shell's own origin
 * in preview/prod — no separate static host required. In dev (`vite
 * dev`) the federation plugin is gated off entirely (workspace alias is
 * used instead) so this handler is only exercised by the production
 * server.
 */
const MFE_MOUNTS: Record<string, string> = {
	"mfe-champions": MFE_CHAMPIONS_DIST,
	"mfe-tier-list": MFE_TIER_LIST_DIST,
};

const MIME_TYPES: Record<string, string> = {
	".js": "application/javascript; charset=utf-8",
	".mjs": "application/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".woff": "font/woff",
	".woff2": "font/woff2",
};

function findMfeMount(reqPath: string): { root: string; rel: string } | undefined {
	for (const [name, root] of Object.entries(MFE_MOUNTS)) {
		const prefix = `/static-assets/mfes/${name}/`;
		if (reqPath.startsWith(prefix)) {
			return { root, rel: reqPath.slice(prefix.length) };
		}
	}
	return undefined;
}

function getApp(): Hono {
	const app = new Hono();

	// Register as a global middleware (no path) so it runs before vike's
	// universal catch-all. We dispatch on the URL pathname ourselves
	// because path-scoped `app.get(path, handler)` registrations were
	// being shadowed by vike's `app.all("/*", ...)` in registration
	// order.
	// oxlint-disable typescript-eslint/consistent-return -- Hono middleware idiom: file-serve paths return a Response while fallthrough paths chain via next()
	app.use(async (c, next) => {
		const match = findMfeMount(c.req.path);
		if (!match) {
			await next();
			return;
		}
		// Reject path traversal.
		if (match.rel.includes("..")) {
			return c.notFound();
		}
		const filePath = path.join(match.root, match.rel);
		try {
			const stat = await fs.promises.stat(filePath);
			if (!stat.isFile()) {
				await next();
				return;
			}
			const buf = await fs.promises.readFile(filePath);
			const ext = path.extname(filePath).toLowerCase();
			const type = MIME_TYPES[ext] ?? "application/octet-stream";
			return new Response(buf, {
				status: 200,
				headers: {
					"content-type": type,
					"cache-control": "public, max-age=31536000, immutable",
				},
			});
		} catch {
			await next();
		}
	});

	// Proxy `/api/*` to `@rift/api` (mirrors the Vite dev-server proxy so the
	// browser can talk to the same origin in both dev and prod). Auth.js
	// routes (`/api/auth/**`) MUST be excluded so they reach `authjsHandler`
	// further down the chain — otherwise sign in / sign out get forwarded
	// to the standalone API and 404.
	// oxlint-disable typescript-eslint/consistent-return -- Hono middleware idiom: fallthrough branch chains via next() while proxy branch returns the upstream Response
	app.all("/api/*", async (c, next) => {
		if (c.req.path.startsWith("/api/auth/")) {
			await next();
			return;
		}
		const url = new URL(c.req.url);
		const target = `${RIFT_API_URL}${url.pathname.replace(/^\/api/, "")}${url.search}`;
		const init: RequestInit = {
			method: c.req.method,
			headers: c.req.raw.headers,
		};
		if (c.req.method !== "GET" && c.req.method !== "HEAD") {
			init.body = await c.req.raw.arrayBuffer();
		}
		return fetch(target, init);
	});

	vike(app, [
		// Append Auth.js session to context
		authjsSessionMiddleware,

		// Resolve the signed-in player from the API and attach to context
		playerMiddleware,

		// Read the rift-theme cookie and expose as pageContext.theme
		themeMiddleware,

		// Auth.js route. See https://authjs.dev/getting-started/installation
		authjsHandler,
	]);

	return app;
}

export const app = getApp();

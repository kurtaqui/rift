import { authjsHandler, authjsSessionMiddleware } from "@rift/auth";
import vike from "@vikejs/hono";
import { Hono } from "hono";

import { RIFT_API_URL } from "./env";
import { playerMiddleware } from "./player-middleware";
import { themeMiddleware } from "./theme-middleware";

function getApp(): Hono {
	const app = new Hono();

	// Proxy `/api/*` to `@rift/api`. Auth.js routes (`/api/auth/**`) are
	// excluded so they reach `authjsHandler` on the same origin — required
	// for CSRF cookies to work.
	// oxlint-disable typescript-eslint/consistent-return -- Hono middleware idiom
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
		authjsSessionMiddleware,
		playerMiddleware,
		themeMiddleware,
		authjsHandler,
	]);

	return app;
}

export const app = getApp();

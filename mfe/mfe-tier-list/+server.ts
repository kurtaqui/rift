import "dotenv/config";
import vike from "@vikejs/hono";
import { Hono } from "hono";
import { renderPage } from "vike/server";
import type { Server } from "vike/types";

const app = new Hono();

// Fragment endpoint must be registered before Vike's catch-all middleware.
app.get("/fragment", async c => {
	const url = c.req.query("url");
	if (!url) {
		return c.json({ error: "url query param is required" }, 400);
	}

	// `isFragment: true` is forwarded to `pageContext` so the custom
	// `onRenderHtml` (see `src/pages/+onRenderHtml.ts`) can skip the full
	// HTML document wrapper and return only the React component tree.
	const pageContext = await renderPage({ urlOriginal: url, isFragment: true });

	if (!pageContext.httpResponse) {
		return c.json({ html: null, data: null }, 500);
	}

	// Read the raw component HTML stored by createMfeOnRenderHtml.
	// httpResponse.body contains Vike-injected <script id="vike_pageContext"> and
	// client-entry <script> tags; embedding them in the shell via
	// dangerouslySetInnerHTML causes an id-conflict that breaks the shell's Vike
	// client hydration (shell reads the MFE's vike_pageContext instead of its own).
	const pc = pageContext as Record<string, unknown>;
	const html = (pc["fragmentHtml"] as string | undefined) ?? null;
	if (html === null) {
		return c.json({ html: null, data: null }, 500);
	}
	// `pageContext.data` is the value returned by the page's `+data.ts`.
	// Cast required because Vike's type does not include app-level data.
	const data = pc["data"] ?? null;

	return c.json({ html, data });
});

// Vike handles all non-fragment routes (standalone MFE serving).
vike(app);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3012;

// https://vike.dev/server
export default {
	fetch: app.fetch,
	prod: { port },
} satisfies Server;

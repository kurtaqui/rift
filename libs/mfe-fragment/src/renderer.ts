import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { dangerouslySkipEscape, escapeInject } from "vike/server";

type PageContextForRender = {
	isFragment?: boolean;
	[key: string]: unknown;
};

type OnRenderHtml = (pageContext: Record<string, unknown>) => Promise<unknown>;

/** Matches vike-react's `getPageElement` return signature. */
type GetPageElement = (pageContext: Record<string, unknown>) => { page: React.ReactElement };

/**
 * Renders a React element to an HTML string using renderToPipeableStream,
 * which supports Suspense (required for Stencil SSR components that use
 * React.use() with dynamic imports).
 */
function renderElementToString(element: React.ReactElement): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		const writable = new Writable({
			write(chunk: Buffer, _encoding: BufferEncoding, callback: () => void) {
				chunks.push(chunk);
				callback();
			},
		});
		const { pipe } = renderToPipeableStream(element, {
			onAllReady() {
				pipe(writable);
				writable.on("finish", () => resolve(Buffer.concat(chunks).toString("utf8")));
			},
			onError(error) {
				reject(error);
			},
		});
	});
}

/**
 * Factory that wraps vike-react's default `onRenderHtml` to add fragment
 * rendering support.
 *
 * Usage in an MFE's `+onRenderHtml.ts`:
 * ```ts
 * import { onRenderHtml as vikeReactOnRenderHtml } from "vike-react/__internal/integration/onRenderHtml";
 * import { getPageElement } from "vike-react/__internal/integration/getPageElement";
 * import { createMfeOnRenderHtml } from "@rift/mfe-fragment/renderer";
 * export const onRenderHtml = createMfeOnRenderHtml(vikeReactOnRenderHtml, getPageElement);
 * ```
 *
 * Fragment path (`pageContext.isFragment === true`):
 *   Uses vike-react's `getPageElement` to build the React tree (with
 *   `VikeReactProviderPageContext` so `useData()` / `usePageContext()` work),
 *   then renders it via `renderToPipeableStream` (supports Suspense, needed
 *   for Stencil SSR components). Returns bare component HTML — no
 *   `<!DOCTYPE html>`, no injected scripts — ready to be embedded in the
 *   shell via `MfeSlot`.
 *
 * Non-fragment path:
 *   Delegates to the passed-in vike-react renderer unchanged, preserving
 *   streaming SSR, head tags, and all vike-react config.
 */
export function createMfeOnRenderHtml(defaultRenderer: OnRenderHtml, getPageElement: GetPageElement): OnRenderHtml {
	return async function onRenderHtml(pageContext: Record<string, unknown>) {
		const ctx = pageContext as PageContextForRender;

		if (ctx.isFragment === true) {
			const { page } = getPageElement(pageContext);
			const html = await renderElementToString(page);
			// Return { documentHtml, pageContext: { fragmentHtml } } so Vike merges
			// fragmentHtml onto the real internal pageContext via Object.assign.
			// Mutating the `pageContext` argument directly does NOT work: Vike passes
			// a restricted public-view object to the hook, not the real pageContext,
			// so direct mutations are silently discarded.
			return { documentHtml: escapeInject`${dangerouslySkipEscape(html)}`, pageContext: { fragmentHtml: html } };
		}

		return defaultRenderer(pageContext);
	};
}

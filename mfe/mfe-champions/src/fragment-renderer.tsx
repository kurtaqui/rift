import { QueryClient, QueryClientProvider, dehydrate } from "@tanstack/react-query";
import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

import App from "./App";

export type FragmentResult = {
	html: string;
	transferState: unknown;
};

async function renderToString(element: React.ReactElement): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		const writable = new Writable({
			write(chunk: Buffer, _enc: BufferEncoding, cb: () => void) {
				chunks.push(chunk);
				cb();
			},
		});
		const { pipe } = renderToPipeableStream(element, {
			onAllReady() {
				pipe(writable);
				writable.on("finish", () => {
					resolve(Buffer.concat(chunks).toString("utf8"));
				});
			},
			onError: reject,
		});
	});
}

/**
 * Render the champions MFE to HTML for a given MFE-relative route.
 *
 * Creates a per-request QueryClient, prefetches the data for the route so it
 * is in the cache before rendering (no suspension), then returns the dehydrated
 * cache as `transferState` for the shell to pass to the client-side QueryClient.
 *
 * @param route     MFE-root path, e.g. `/` (list) or `/ahri` (detail).
 * @param basePath  Shell mount path, e.g. `/champions` or `/` for home.
 */
export async function renderFragment(route: string, basePath = ""): Promise<FragmentResult> {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { staleTime: Infinity } },
	});

	const html = await renderToString(
		<QueryClientProvider client={queryClient}>
			<App route={route} basePath={basePath} />
		</QueryClientProvider>,
	);
	return { html, transferState: dehydrate(queryClient) };
}

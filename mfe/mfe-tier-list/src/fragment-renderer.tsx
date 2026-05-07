import { QueryClient, QueryClientProvider, dehydrate } from "@tanstack/react-query";
import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

import App from "./App";
import { tierListQueryOptions } from "./pages/tier-list/data";

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
 * Render the tier-list MFE to HTML.
 *
 * Creates a per-request QueryClient, prefetches tier-list data so it is in the
 * cache before rendering (no suspension), then returns the dehydrated cache as
 * `transferState` for the shell to pass to the client-side QueryClient.
 */
export async function renderFragment(): Promise<FragmentResult> {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { staleTime: Infinity } },
	});

	await queryClient.prefetchQuery(tierListQueryOptions());

	const html = await renderToString(
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>,
	);
	return { html, transferState: dehydrate(queryClient) };
}

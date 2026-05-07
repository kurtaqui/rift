import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

import App from "./App";
import { data as tierData } from "./pages/tier-list/data";

export type FragmentResult = {
	html: string;
	data: unknown;
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
 * Uses renderToPipeableStream so react-router-dom v7's internal Suspense
 * boundaries are flushed correctly.
 */
export async function renderFragment(): Promise<FragmentResult> {
	const fragmentData = await tierData();
	const html = await renderToString(<App data={fragmentData} />);
	return { html, data: fragmentData };
}

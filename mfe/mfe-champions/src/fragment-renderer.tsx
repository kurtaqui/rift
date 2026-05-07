import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

import App from "./App";
import { fetchChampionDetail as detailData } from "./pages/champion-detail/data";
import { data as listData } from "./pages/champions-list/data";

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
 * Render the champions MFE to HTML for a given MFE-relative route.
 *
 * Uses renderToPipeableStream so react-router-dom v7's internal Suspense
 * boundaries are flushed correctly. renderToString throws on Suspense.
 *
 * @param route     MFE-root path, e.g. `/` (list) or `/ahri` (detail).
 * @param basePath  Shell mount path, e.g. `/champions`.
 */
export async function renderFragment(route: string, basePath = ""): Promise<FragmentResult> {
	let fragmentData: unknown = null;

	if (route === "/" || route === "") {
		fragmentData = await listData();
	} else {
		const id = route.replace(/^\//, "");
		fragmentData = await detailData(id);
	}

	const html = await renderToString(<App route={route} basePath={basePath} data={fragmentData} />);
	return { html, data: fragmentData };
}

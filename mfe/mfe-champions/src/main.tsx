/**
 * Smoke-test entry for the `mfe-champions` MF remote. In production the
 * shell host loads this MFE via Module Federation — this entry is only
 * used for `vite preview` to verify the remote in isolation.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import Page from "./pages/champions-list/Page";

const container = document.querySelector("#root");
if (!container) {
	throw new Error("Missing #root element in index.html");
}

createRoot(container).render(
	<StrictMode>
		<div style={{ padding: 24, fontFamily: "system-ui" }}>
			<p style={{ color: "#888", fontSize: 12 }}>
				mfe-champions remote — preview mode (loaded via SSR data is unavailable here)
			</p>
			<Page />
		</div>
	</StrictMode>,
);

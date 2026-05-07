import { useEffect } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

import { registerNavigate } from "./navigate-bridge";
import ChampionDetailPage from "./pages/champion-detail/Page";
import ChampionsListPage from "./pages/champions-list/Page";

type AppProps = {
	/** Data returned by the fragment server, forwarded to pages. */
	data?: unknown;
	/** Shell mount path for this MFE, e.g. `/champions`. */
	basePath?: string;
	/**
	 * MFE-relative route, e.g. `/` or `/ahri`.
	 * On initial render (SSR + hydration): derived from `window.location`.
	 * On Vike SPA navigations: updated by the shell via `setNavigate()`.
	 */
	route?: string;
};

/**
 * Bridges the `registerNavigate` ref → MemoryRouter's `useNavigate`.
 * Must render inside the router so it has access to the navigate function.
 */
function NavigateBridge(): null {
	const navigate = useNavigate();
	useEffect(() => registerNavigate((r: string) => {}), [navigate]);
	return null;
}

export default function App({ data, basePath, route }: AppProps) {
	const initialPath = route ?? "/";

	return (
		<MemoryRouter initialEntries={[initialPath]}>
			<NavigateBridge />
			<Routes>
				<Route path="/:id" element={<ChampionDetailPage data={data} basePath={basePath} />} />
				<Route path="/" element={<ChampionsListPage data={data} basePath={basePath} />} />
			</Routes>
		</MemoryRouter>
	);
}

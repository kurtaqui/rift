import { MemoryRouter, Route, Routes } from "react-router-dom";

import ChampionDetailPage from "./pages/champion-detail/Page";
import ChampionsListPage from "./pages/champions-list/Page";

type AppProps = {
	/** Data returned by the fragment server / Vike +data.ts for this render. */
	data?: unknown;
	/**
	 * The shell's URL prefix for this MFE (e.g. "/champions").
	 * Stripped from `window.location.pathname` before seeding MemoryRouter so
	 * the in-MFE router sees MFE-root-relative paths:
	 *   shell "/champions"       → MFE "/"
	 *   shell "/champions/ahri"  → MFE "/ahri"
	 */
	basePath?: string;
};

export default function App({ data, basePath = "" }: AppProps) {
	// Derive the MFE-relative path from the current browser URL.
	// `typeof window` guard for SSR safety (should never render on server, but
	// defensive to avoid crashing in unexpected environments).
	const initialPath = typeof window !== "undefined" ? window.location.pathname.slice(basePath.length) || "/" : "/";

	return (
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route path="/:id" element={<ChampionDetailPage data={data} />} />
				<Route path="/" element={<ChampionsListPage data={data} />} />
			</Routes>
		</MemoryRouter>
	);
}

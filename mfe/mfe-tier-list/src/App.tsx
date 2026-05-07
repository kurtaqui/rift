import { Suspense } from "react";

import TierListPage from "./pages/tier-list/Page";

type AppProps = {
	/** Shell mount path, e.g. `/tier-list`. Unused — tier-list is single-page. */
	basePath?: string;
};

export default function App({ basePath: _basePath }: AppProps) {
	return (
		<Suspense fallback={null}>
			<TierListPage />
		</Suspense>
	);
}

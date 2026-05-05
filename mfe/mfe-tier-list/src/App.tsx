import TierListPage from "./pages/tier-list/Page";

type AppProps = {
	/** Data returned by the fragment server / Vike +data.ts for this render. */
	data?: unknown;
	/** Unused — tier-list is a single-page MFE with no sub-routes. */
	basePath?: string;
};

export default function App({ data }: AppProps) {
	return <TierListPage data={data} />;
}

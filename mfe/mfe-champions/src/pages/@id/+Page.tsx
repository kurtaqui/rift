import { usePageContext } from "vike-react/usePageContext";

import ChampionDetailPage from "../champion-detail/Page";

export default function Page() {
	const { routeParams } = usePageContext();
	return <ChampionDetailPage id={routeParams.id ?? ""} />;
}

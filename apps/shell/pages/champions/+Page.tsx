import { MfeSlot } from "@rift/mfe-fragment/client";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";

import type { ChampionsData } from "./+data";

export default function Page(): React.JSX.Element {
	const { mfeHtml, mfeData, mfeSrc, pageContext } = useData<ChampionsData>();
	const { isHydration } = usePageContext();
	return <MfeSlot src={mfeSrc} pageContext={{ ...pageContext, isHydration }} ssrHtml={mfeHtml} ssrData={mfeData} />;
}

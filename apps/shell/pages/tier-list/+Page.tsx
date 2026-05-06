import { MfeSlot } from "@rift/mfe-fragment/client";
import type { MfeFragmentData } from "@rift/mfe-fragment/client";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";

export default function Page(): React.JSX.Element {
	const { mfeHtml, mfeData } = useData<MfeFragmentData>();
	const { isHydration } = usePageContext();
	return <MfeSlot mfe="tier-list" mfeHtml={mfeHtml} mfeData={mfeData} isHydration={isHydration} />;
}

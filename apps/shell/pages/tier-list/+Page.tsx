import { MfeSlot } from "@rift/mfe-fragment/client";
import type { MfeFragmentData } from "@rift/mfe-fragment/client";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";

// In dev, load the MFE App directly via Vite alias (no MF runtime needed).
// In prod, MfeSlot falls back to loadRemote via Module Federation.
const devLoader = import.meta.env.DEV ? async () => import("~mfe/tier-list") : undefined;

export default function Page(): React.JSX.Element {
	const { mfeHtml, mfeData } = useData<MfeFragmentData>();
	const { isHydration } = usePageContext();
	return (
		<MfeSlot mfe="tier-list" mfeHtml={mfeHtml} mfeData={mfeData} devLoader={devLoader} isHydration={isHydration} />
	);
}

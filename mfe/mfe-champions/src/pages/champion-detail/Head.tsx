import { useData } from "vike-react/useData";

import type { Data } from "./data";

export function Head() {
	const { name } = useData<Data>();
	return <title>{name} — Champions · Rift</title>;
}

import { LolChampionCard } from "@rift/ui/react";
import { useData } from "vike-react/useData";

import type { Data } from "./data";

export default function Page({ data: dataProp, basePath = "" }: { data?: unknown; basePath?: string }) {
	const hookData = useData<Data>();
	const normalizedBasePath = basePath === "/" ? "" : basePath.replace(/\/+$/, "");

	// dataProp is typed `unknown` at the MFE boundary. If it's a non-null object,
	// treat it as the expected Data shape (passed from App.tsx or MfeSlot).
	const resolved: Data =
		dataProp !== undefined && dataProp !== null && typeof dataProp === "object"
			? // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- object-guard above makes this safe
				(dataProp as unknown as Data)
			: hookData;
	// Guard: fragment server unreachable and no Vike context (e.g. devLoader without data).
	// todo: return 404
	if (!resolved) {
		return null;
	}
	const { champions } = resolved;

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">Champions</h1>
				<p className="mt-1 text-muted-foreground">
					{champions.length} champions — browse and discover abilities, skins and lore.
				</p>
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
				{champions.map(champion => (
					<a
						key={champion.id}
						href={`${normalizedBasePath}/${champion.id}`}
						className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
						<LolChampionCard
							name={champion.name}
							splashArtUrl={champion.splashArtUrl}
							roles={champion.roles.join(",")}
							difficulty={champion.difficulty}
						/>
					</a>
				))}
			</div>
		</div>
	);
}

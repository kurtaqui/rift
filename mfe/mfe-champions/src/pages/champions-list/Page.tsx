import { LolChampionCard } from "@rift/ui/react";
import { useData } from "vike-react/useData";

import type { Data } from "./data";

export default function Page() {
	const { champions } = useData<Data>();

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
						href={`/champions/${champion.id}`}
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

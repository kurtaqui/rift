import type { Tier } from "@rift/champion";
import { LolTierBadge } from "@rift/ui/react";
import type { ReactElement } from "react";

import type { EnrichedTierEntry } from "../pages/tier-list/data";

type Props = {
	tier: Tier;
	entries: EnrichedTierEntry[];
};

export function TierRow({ tier, entries }: Props): ReactElement | null {
	if (entries.length === 0) {
		return null;
	}

	return (
		<div className="flex gap-4 items-start">
			{/* Tier badge column */}
			<div className="flex-shrink-0 w-12 flex flex-col items-center pt-3">
				<LolTierBadge tier={tier} />
			</div>

			{/* Champion cards */}
			<div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
				{entries.map(entry => (
					<a
						key={entry.id}
						href={`/champions/${entry.champion.id}`}
						className="group rounded-lg border border-border bg-card hover:border-primary/50 transition-colors overflow-hidden">
						<div className="aspect-video overflow-hidden">
							<img
								src={entry.champion.splashArtUrl}
								alt={entry.champion.name}
								className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
							/>
						</div>
						<div className="p-2">
							<p className="text-xs font-semibold truncate">{entry.champion.name}</p>
							<p className="text-xs text-muted-foreground">{entry.role}</p>
							<div className="flex justify-between mt-1">
								<span className="text-xs text-green-400">{entry.winRate.toFixed(1)}% WR</span>
								<span className="text-xs text-muted-foreground">{entry.pickRate.toFixed(1)}% PR</span>
							</div>
						</div>
					</a>
				))}
			</div>
		</div>
	);
}

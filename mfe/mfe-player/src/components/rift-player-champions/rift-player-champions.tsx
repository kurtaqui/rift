import { Component, Prop, h } from "@stencil/core";

import { MOCK_OWNED_CHAMPIONS, formatPoints } from "../../data/mock";
import type { PlayerChampionEntry } from "../../data/mock";

@Component({
	tag: "rift-player-champions",
	styleUrl: "rift-player-champions.css",
	shadow: true,
})
export class RiftPlayerChampions {
	/** Owned champions. Falls back to mock data when not provided. */
	@Prop() ownedChampions?: PlayerChampionEntry[];

	render() {
		const list = this.ownedChampions && this.ownedChampions.length > 0 ? this.ownedChampions : MOCK_OWNED_CHAMPIONS;
		return (
			<div>
				<h2 class="heading">Owned Champions ({list.length})</h2>
				<div class="grid">
					{list.map(c => (
						<article class="tile" key={c.championId}>
							<span class="name">{c.championName}</span>
							<span class="meta">
								M{c.masteryLevel} · {formatPoints(c.masteryPoints)} pts
							</span>
						</article>
					))}
				</div>
			</div>
		);
	}
}

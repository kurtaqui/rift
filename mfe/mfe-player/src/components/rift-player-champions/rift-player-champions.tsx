import { Component, Prop, h } from "@stencil/core";

import { formatPoints } from "../../data/mock";
import type { PlayerChampionEntry } from "../../data/mock";

@Component({
	tag: "rift-player-champions",
	styleUrl: "rift-player-champions.css",
	shadow: true,
})
export class RiftPlayerChampions {
	/** Owned champions. Renders a skeleton grid when not yet loaded. */
	@Prop() ownedChampions?: PlayerChampionEntry[];

	private renderSkeleton() {
		return (
			<div class="grid" aria-hidden="true">
				{[0, 1, 2, 3, 4, 5].map(i => (
					<article class="tile" key={i}>
						<div class="skel skel-name" />
						<div class="skel skel-meta" />
					</article>
				))}
			</div>
		);
	}

	render() {
		return (
			<div>
				<h2 class="heading">
					Owned Champions{this.ownedChampions === undefined ? "" : ` (${this.ownedChampions.length})`}
				</h2>
				{this.ownedChampions === undefined ? (
					this.renderSkeleton()
				) : (
					<div class="grid">
						{this.ownedChampions.map(c => (
							<article class="tile" key={c.championId}>
								<span class="name">{c.championName}</span>
								<span class="meta">
									M{c.masteryLevel} · {formatPoints(c.masteryPoints)} pts
								</span>
							</article>
						))}
					</div>
				)}
			</div>
		);
	}
}

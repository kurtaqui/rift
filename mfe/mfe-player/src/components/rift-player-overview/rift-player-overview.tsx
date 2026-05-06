import { Component, Prop, h } from "@stencil/core";

import { formatPoints } from "../../data/mock";
import type { PlayerChampionEntry, PlayerSummary } from "../../data/mock";

@Component({
	tag: "rift-player-overview",
	styleUrl: "rift-player-overview.css",
	shadow: true,
})
export class RiftPlayerOverview {
	@Prop() user?: PlayerSummary;
	/** Top champions by mastery. Falls back to a skeleton when not yet loaded. */
	@Prop() topMastery?: PlayerChampionEntry[];

	private renderSkeleton() {
		return (
			<div class="wrap">
				{[0, 1, 2].map(i => (
					<article class="card" key={i} aria-hidden="true">
						<div class="skel skel-name" />
						<div class="skel skel-pts" />
						<div class="skel skel-lvl" />
					</article>
				))}
			</div>
		);
	}

	render() {
		return (
			<div>
				<h2 class="heading">
					Top 3 Champions <span class="muted">by mastery</span>
				</h2>
				{this.topMastery === undefined ? (
					this.renderSkeleton()
				) : (
					<div class="wrap">
						{this.topMastery.map(c => (
							<article class="card" key={c.championId}>
								<div class="name">{c.championName}</div>
								<div class="points">{formatPoints(c.masteryPoints)}</div>
								<div class="mastery">Mastery {c.masteryLevel}</div>
							</article>
						))}
					</div>
				)}
			</div>
		);
	}
}

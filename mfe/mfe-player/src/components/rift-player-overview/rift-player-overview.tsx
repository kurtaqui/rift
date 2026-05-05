import { Component, Prop, h } from "@stencil/core";

import { MOCK_TOP_MASTERY, formatPoints } from "../../data/mock";
import type { PlayerChampionEntry, PlayerSummary } from "../../data/mock";

@Component({
	tag: "rift-player-overview",
	styleUrl: "rift-player-overview.css",
	shadow: true,
})
export class RiftPlayerOverview {
	@Prop() user?: PlayerSummary;
	/** Top champions by mastery. Falls back to mock data when not provided. */
	@Prop() topMastery?: PlayerChampionEntry[];

	render() {
		const top = this.topMastery && this.topMastery.length > 0 ? this.topMastery : MOCK_TOP_MASTERY;
		return (
			<div>
				<h2 class="heading">
					Top 3 Champions <span class="muted">by mastery</span>
				</h2>
				<div class="wrap">
					{top.map(c => (
						<article class="card" key={c.championId}>
							<div class="name">{c.championName}</div>
							<div class="points">{formatPoints(c.masteryPoints)}</div>
							<div class="mastery">Mastery {c.masteryLevel}</div>
						</article>
					))}
				</div>
				{this.user ? null : (
					<p class="muted" style={{ marginTop: "1rem" }}>
						Sign in for personalised stats.
					</p>
				)}
			</div>
		);
	}
}

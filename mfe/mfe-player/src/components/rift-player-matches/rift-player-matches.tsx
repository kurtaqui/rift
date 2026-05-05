import { Component, Prop, h } from "@stencil/core";

import { MOCK_MATCH_HISTORY, formatDuration } from "../../data/mock";
import type { MatchEntry } from "../../data/mock";

@Component({
	tag: "rift-player-matches",
	styleUrl: "rift-player-matches.css",
	shadow: true,
})
export class RiftPlayerMatches {
	/** Match history. Falls back to mock data when not provided. */
	@Prop() matchHistory?: MatchEntry[];

	render() {
		const rows = this.matchHistory && this.matchHistory.length > 0 ? this.matchHistory : MOCK_MATCH_HISTORY;
		return (
			<div>
				<h2 class="heading">Match History</h2>
				<table class="table">
					<thead>
						<tr>
							<th>Champion</th>
							<th>Role</th>
							<th>K / D / A</th>
							<th>Duration</th>
							<th>Result</th>
						</tr>
					</thead>
					<tbody>
						{rows.map(m => (
							<tr key={m.id}>
								<td>{m.championName}</td>
								<td>{m.role}</td>
								<td>
									{m.kills} / {m.deaths} / {m.assists}
								</td>
								<td>{formatDuration(m.gameDurationSec)}</td>
								<td class={m.win ? "win" : "loss"}>{m.win ? "Win" : "Loss"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}
}

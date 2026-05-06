import { Component, Prop, h } from "@stencil/core";

import { formatDuration } from "../../data/mock";
import type { MatchEntry } from "../../data/mock";

@Component({
	tag: "rift-player-matches",
	styleUrl: "rift-player-matches.css",
	shadow: true,
})
export class RiftPlayerMatches {
	/** Match history. Renders a skeleton table when not yet loaded. */
	@Prop() matchHistory?: MatchEntry[];

	private renderSkeleton() {
		const widths = ["55%", "40%", "60%", "35%", "30%"] as const;
		const rows = [0, 1, 2, 3, 4] as const;
		return (
			<tbody aria-hidden="true">
				{rows.map(i => (
					<tr key={i}>
						{widths.map(w => (
							<td key={w}>
								<div class="skel" style={{ height: "0.875rem", width: w }} />
							</td>
						))}
					</tr>
				))}
			</tbody>
		);
	}

	render() {
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
					{this.matchHistory === undefined ? (
						this.renderSkeleton()
					) : (
						<tbody>
							{this.matchHistory.map(m => (
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
					)}
				</table>
			</div>
		);
	}
}

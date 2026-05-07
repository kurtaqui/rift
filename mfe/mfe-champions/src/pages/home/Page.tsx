import type { PlayerSummary } from "@rift/data-access";
import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";

import { playerSummaryQueryOptions } from "./data";

export default function HomePage({ basePath = "" }: { basePath?: string }): JSX.Element {
	// SSR always renders Marketing. On the client, if the user is signed in the
	// Dashboard swaps in once the session-aware player summary query resolves.
	return <HomeClient basePath={basePath} />;
}

function HomeClient({ basePath }: { basePath: string }): JSX.Element {
	const { data: summary, isPending, isFetching } = useQuery(playerSummaryQueryOptions());

	// Show Marketing while loading or refetching. Only swap to Dashboard once
	// the current fetch settles successfully — this prevents stale signed-in
	// data (from a shared QueryClient) from rendering for a signed-out user.
	if (isPending || isFetching) {
		return <Marketing basePath={basePath} />;
	}

	if (summary) {
		return <Dashboard summary={summary} basePath={basePath} />;
	}

	return <Marketing basePath={basePath} />;
}

function Marketing({ basePath }: { basePath: string }): JSX.Element {
	const normalizedBase = basePath === "/" ? "" : basePath.replace(/\/+$/, "");

	return (
		<div className="space-y-12">
			<section className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-10 text-center">
				<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
					League of Legends companion
				</p>
				<h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Welcome to Rift</h1>
				<p className="mt-3 text-base text-muted-foreground sm:text-lg">
					Browse champions, follow the meta, and track your own climb.
				</p>
				<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
					<a
						href="/login"
						className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
						Sign in
					</a>
					<a
						href={`${normalizedBase}/champions`}
						className="inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
						Browse champions
					</a>
				</div>
			</section>

			<section className="grid gap-4 sm:grid-cols-3">
				<FeatureCard
					href={`${normalizedBase}/champions`}
					title="Champions"
					description="Search every champion in the game with abilities, stats, and lore."
				/>
				<FeatureCard
					href="/tier-list"
					title="Tier List"
					description="Patch-aware S–D rankings filtered by role, win rate, and pick rate."
				/>
				<FeatureCard
					href="/login"
					title="My Profile"
					description="Sign in to see your top mastery, owned champions, and recent matches."
				/>
			</section>
		</div>
	);
}

function FeatureCard({ href, title, description }: { href: string; title: string; description: string }): JSX.Element {
	return (
		<a
			href={href}
			className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40">
			<h2 className="text-lg font-semibold">{title}</h2>
			<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			<span className="mt-3 inline-block text-sm font-medium text-primary group-hover:underline">Open →</span>
		</a>
	);
}

function Dashboard({ summary, basePath }: { summary: PlayerSummary; basePath: string }): JSX.Element {
	const normalizedBase = basePath === "/" ? "" : basePath.replace(/\/+$/, "");
	const { user, topMastery, matches } = summary;
	const recent = matches.slice(0, 5);

	return (
		<div className="space-y-8">
			<section className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-8">
				<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Welcome back</p>
				<h1 className="mt-2 text-3xl font-bold tracking-tight">{user.summonerName}</h1>
				<p className="mt-1 text-sm text-muted-foreground">Summoner level {user.summonerLevel}</p>
			</section>

			<section className="grid gap-6 lg:grid-cols-2">
				<div className="rounded-lg border border-border bg-card p-5 shadow-sm">
					<header className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold">Top mastery</h2>
						<a href="/player" className="text-xs font-medium text-primary hover:underline">
							View all →
						</a>
					</header>
					{topMastery.length === 0 ? (
						<p className="text-sm text-muted-foreground">No champions tracked yet.</p>
					) : (
						<ul className="divide-y divide-border">
							{topMastery.map(c => (
								<li key={c.championId} className="flex items-center justify-between py-2 text-sm">
									<a href={`${normalizedBase}/champions/${c.championId}`} className="font-medium hover:underline">
										{c.championName}
									</a>
									<span className="text-muted-foreground">
										Lv {c.masteryLevel} · {c.masteryPoints.toLocaleString()} pts
									</span>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="rounded-lg border border-border bg-card p-5 shadow-sm">
					<header className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold">Recent matches</h2>
						<a href="/player/match-history" className="text-xs font-medium text-primary hover:underline">
							View all →
						</a>
					</header>
					{recent.length === 0 ? (
						<p className="text-sm text-muted-foreground">No matches recorded yet.</p>
					) : (
						<ul className="divide-y divide-border">
							{recent.map(m => (
								<li key={m.id} className="flex items-center justify-between py-2 text-sm">
									<div className="flex items-center gap-2">
										<span
											className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
												m.win
													? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
													: "bg-red-500/15 text-red-600 dark:text-red-400"
											}`}>
											{m.win ? "W" : "L"}
										</span>
										<a href={`${normalizedBase}/champions/${m.championId}`} className="font-medium hover:underline">
											{m.championName}
										</a>
										<span className="text-xs text-muted-foreground">{m.role}</span>
									</div>
									<span className="text-muted-foreground">
										{m.kills}/{m.deaths}/{m.assists}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			</section>
		</div>
	);
}

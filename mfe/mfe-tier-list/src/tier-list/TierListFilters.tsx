"use client";

import type { ChampionRole, Tier } from "@rift/champion";
import { useAtom } from "jotai";
import type { ReactElement } from "react";

import { FilterButton } from "./FilterButton";
import { patchAtom, roleAtom, tierAtom } from "./tier-list.atoms";

const TIERS: (Tier | "all")[] = ["all", "S", "A", "B", "C", "D"];
const ROLES: (ChampionRole | "all")[] = ["all", "Top", "Jungle", "Mid", "ADC", "Support"];

const TIER_COLORS: Record<string, string> = {
	S: "border-amber-400 bg-amber-400/10 text-amber-400",
	A: "border-purple-400 bg-purple-400/10 text-purple-400",
	B: "border-blue-400 bg-blue-400/10 text-blue-400",
	C: "border-green-400 bg-green-400/10 text-green-400",
	D: "border-gray-400 bg-gray-400/10 text-gray-400",
	all: "border-border bg-muted/50 text-foreground",
};

const TIER_INACTIVE = "border-border text-muted-foreground hover:border-current hover:text-foreground";
const ROLE_ACTIVE = "border-primary bg-primary/10 text-primary ring-1 ring-primary";
const ROLE_INACTIVE = "border-border text-muted-foreground hover:border-foreground hover:text-foreground";

type Props = {
	patches: string[];
};

export function TierListFilters({ patches }: Props): ReactElement {
	const [tier, setTier] = useAtom(tierAtom);
	const [role, setRole] = useAtom(roleAtom);
	const [patch, setPatch] = useAtom(patchAtom);

	return (
		<div className="space-y-3 mb-8 p-4 rounded-xl border border-border bg-card">
			<div>
				<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tier</p>
				<div className="flex flex-wrap gap-2">
					{TIERS.map(t => (
						<FilterButton
							key={t}
							value={t}
							active={tier === t}
							onSelect={setTier}
							className={`px-3 py-1 rounded-md text-sm font-semibold border transition-colors ${
								tier === t ? `${TIER_COLORS[t]} ring-1 ring-current` : TIER_INACTIVE
							}`}>
							{t === "all" ? "All Tiers" : t}
						</FilterButton>
					))}
				</div>
			</div>

			<div>
				<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Role</p>
				<div className="flex flex-wrap gap-2">
					{ROLES.map(r => (
						<FilterButton
							key={r}
							value={r}
							active={role === r}
							onSelect={setRole}
							className={`px-3 py-1 rounded-md text-sm font-medium border transition-colors ${
								role === r ? ROLE_ACTIVE : ROLE_INACTIVE
							}`}>
							{r === "all" ? "All Roles" : r}
						</FilterButton>
					))}
				</div>
			</div>

			{patches.length > 1 && (
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Patch</p>
					<div className="flex flex-wrap gap-2">
						<FilterButton
							value="latest"
							active={patch === "latest"}
							onSelect={setPatch}
							className={`px-3 py-1 rounded-md text-sm font-medium border transition-colors ${
								patch === "latest" ? ROLE_ACTIVE : ROLE_INACTIVE
							}`}>
							Latest
						</FilterButton>
						{patches.map(p => (
							<FilterButton
								key={p}
								value={p}
								active={patch === p}
								onSelect={setPatch}
								className={`px-3 py-1 rounded-md text-sm font-medium border transition-colors ${
									patch === p ? ROLE_ACTIVE : ROLE_INACTIVE
								}`}>
								{p}
							</FilterButton>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

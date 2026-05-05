"use client";

import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { useData } from "vike-react/useData";

import { tierAtom, roleAtom, patchAtom } from "../../tier-list/tier-list.atoms";
import { TierListFilters } from "../../tier-list/TierListFilters";
import { TierRow } from "../../tier-list/TierRow";
import type { Data } from "./data";

const TIER_ORDER = ["S", "A", "B", "C", "D"] as const;
const EMPTY_ENTRIES: never[] = [];

export default function Page({ data: dataProp }: { data?: unknown }) {
	const hookData = useData<Data>();
	// dataProp is typed `unknown` at the MFE boundary. If it's a non-null object,
	// treat it as the expected Data shape (passed from App.tsx or MfeSlot).
	const resolved: Data =
		dataProp !== undefined && dataProp !== null && typeof dataProp === "object"
			? // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- object-guard above makes this safe
				(dataProp as unknown as Data)
			: hookData;
	const { entries, patches } = resolved;

	const tierFilter = useAtomValue(tierAtom);
	const roleFilter = useAtomValue(roleAtom);
	const patchFilter = useAtomValue(patchAtom);

	const latestPatch = patches[0] ?? "";

	const filtered = useMemo(
		() =>
			entries.filter(entry => {
				if (tierFilter !== "all" && entry.tier !== tierFilter) {
					return false;
				}
				if (roleFilter !== "all" && entry.role !== roleFilter) {
					return false;
				}
				const effectivePatch = patchFilter === "latest" ? latestPatch : patchFilter;
				if (effectivePatch && entry.patch !== effectivePatch) {
					return false;
				}
				return true;
			}),
		[entries, tierFilter, roleFilter, patchFilter, latestPatch],
	);

	const byTier = useMemo(() => {
		const map = new Map<string, typeof filtered>();
		for (const tier of TIER_ORDER) {
			map.set(tier, []);
		}
		for (const entry of filtered) {
			map.get(entry.tier)?.push(entry);
		}
		return map;
	}, [filtered]);

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-3xl font-bold tracking-tight">Tier List</h1>
				<p className="mt-1 text-muted-foreground">
					Patch {patchFilter === "latest" ? latestPatch : patchFilter} — {filtered.length} champion/role combinations
				</p>
			</div>

			<TierListFilters patches={patches} />

			{filtered.length === 0 ? (
				<p className="text-center text-muted-foreground py-16">No champions match these filters.</p>
			) : (
				<div className="space-y-6">
					{TIER_ORDER.map(tier => (
						<TierRow key={tier} tier={tier} entries={byTier.get(tier) ?? EMPTY_ENTRIES} />
					))}
				</div>
			)}
		</div>
	);
}

/**
 * Mock data for the player MFE. Embedded in the Stencil package so the
 * component renders identically on the server (SSR / DSD) and the client
 * (hydration). Real-world: replace with a fetch in `componentWillLoad`.
 */

export type PlayerSummary = {
	id: string;
	summonerName: string;
	profileIconId: number;
	summonerLevel: number;
};

export type PlayerChampionEntry = {
	championId: string;
	championName: string;
	masteryLevel: number;
	masteryPoints: number;
	owned: boolean;
};

export type MatchEntry = {
	id: string;
	championName: string;
	role: "Top" | "Jungle" | "Mid" | "ADC" | "Support";
	kills: number;
	deaths: number;
	assists: number;
	win: boolean;
	gameDurationSec: number;
	matchDate: string;
};

export const formatDuration = (sec: number): string => {
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m}m ${s.toString().padStart(2, "0")}s`;
};

export const formatPoints = (points: number): string => points.toLocaleString("en-US");

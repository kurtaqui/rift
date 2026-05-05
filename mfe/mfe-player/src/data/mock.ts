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

export const MOCK_TOP_MASTERY: PlayerChampionEntry[] = [
	{
		championId: "ahri",
		championName: "Ahri",
		masteryLevel: 7,
		masteryPoints: 482_310,
		owned: true,
	},
	{
		championId: "lee-sin",
		championName: "Lee Sin",
		masteryLevel: 7,
		masteryPoints: 318_902,
		owned: true,
	},
	{
		championId: "jinx",
		championName: "Jinx",
		masteryLevel: 6,
		masteryPoints: 211_443,
		owned: true,
	},
];

export const MOCK_OWNED_CHAMPIONS: PlayerChampionEntry[] = [
	...MOCK_TOP_MASTERY,
	{ championId: "thresh", championName: "Thresh", masteryLevel: 5, masteryPoints: 88_120, owned: true },
	{ championId: "garen", championName: "Garen", masteryLevel: 5, masteryPoints: 64_900, owned: true },
	{ championId: "lux", championName: "Lux", masteryLevel: 4, masteryPoints: 42_310, owned: true },
	{ championId: "yasuo", championName: "Yasuo", masteryLevel: 4, masteryPoints: 38_205, owned: true },
	{ championId: "zed", championName: "Zed", masteryLevel: 3, masteryPoints: 22_150, owned: true },
	{ championId: "ezreal", championName: "Ezreal", masteryLevel: 3, masteryPoints: 18_400, owned: true },
	{ championId: "morgana", championName: "Morgana", masteryLevel: 2, masteryPoints: 9120, owned: true },
];

export const MOCK_MATCH_HISTORY: MatchEntry[] = [
	{
		id: "m-1",
		championName: "Ahri",
		role: "Mid",
		kills: 12,
		deaths: 3,
		assists: 8,
		win: true,
		gameDurationSec: 1842,
		matchDate: "2025-11-22T18:14:00Z",
	},
	{
		id: "m-2",
		championName: "Lee Sin",
		role: "Jungle",
		kills: 6,
		deaths: 4,
		assists: 14,
		win: true,
		gameDurationSec: 2110,
		matchDate: "2025-11-22T16:01:00Z",
	},
	{
		id: "m-3",
		championName: "Jinx",
		role: "ADC",
		kills: 9,
		deaths: 7,
		assists: 6,
		win: false,
		gameDurationSec: 2418,
		matchDate: "2025-11-21T22:33:00Z",
	},
	{
		id: "m-4",
		championName: "Thresh",
		role: "Support",
		kills: 1,
		deaths: 5,
		assists: 22,
		win: true,
		gameDurationSec: 1990,
		matchDate: "2025-11-21T20:11:00Z",
	},
	{
		id: "m-5",
		championName: "Garen",
		role: "Top",
		kills: 8,
		deaths: 6,
		assists: 4,
		win: false,
		gameDurationSec: 2255,
		matchDate: "2025-11-20T19:48:00Z",
	},
];

export const formatDuration = (sec: number): string => {
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m}m ${s.toString().padStart(2, "0")}s`;
};

export const formatPoints = (points: number): string => points.toLocaleString("en-US");

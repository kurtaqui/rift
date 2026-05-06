import type { Session } from "@auth/core/types";

import type { PageContextPlayer } from "./server/player-middleware";

interface ImportMetaEnv {
	/**
	 * Client-side URL for mfe-champions MF manifest + JS chunks.
	 * Injected at compile-time from MFE_CHAMPIONS_CLIENT_URL (or MFE_CHAMPIONS_URL as
	 * fallback) by vite.config.ts define.
	 */
	readonly VITE_MFE_CHAMPIONS_URL: string;
	/**
	 * Client-side URL for mfe-tier-list MF manifest + JS chunks.
	 * Injected at compile-time from MFE_TIER_LIST_CLIENT_URL (or MFE_TIER_LIST_URL as
	 * fallback) by vite.config.ts define.
	 */
	readonly VITE_MFE_TIER_LIST_URL: string;
}

declare global {
	namespace Vike {
		interface PageContext {
			session?: Session | null;
			player?: PageContextPlayer | null;
			theme?: "system" | "light" | "dark";
		}
	}
}

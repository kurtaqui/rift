import type { Session } from "@auth/core/types";

import type { PageContextPlayer } from "./server/player-middleware";

declare global {
	namespace Vike {
		interface PageContext {
			session?: Session | null;
			player?: PageContextPlayer | null;
			theme?: "system" | "light" | "dark";
		}
	}
}

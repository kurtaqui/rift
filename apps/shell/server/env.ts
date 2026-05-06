import path from "node:path";

function requireEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

/** Base URL of the Rift API server, used for server-side proxying. */
export const RIFT_API_URL = requireEnv("RIFT_API_URL");

/**
 * Filesystem paths to each MFE's built `dist/` directory.
 * Resolved relative to `process.cwd()` (apps/shell/).
 * Override with `MFE_*_DIST` env vars when serving from a different working directory.
 */
const cwd = process.cwd();
export const MFE_CHAMPIONS_DIST = path.resolve(cwd, requireEnv("MFE_CHAMPIONS_DIST"));
export const MFE_TIER_LIST_DIST = path.resolve(cwd, requireEnv("MFE_TIER_LIST_DIST"));

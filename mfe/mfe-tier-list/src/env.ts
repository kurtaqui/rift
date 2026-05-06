function requireEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

/** Base URL of the Rift API server (server-side only). */
export const RIFT_API_URL = requireEnv("RIFT_API_URL");

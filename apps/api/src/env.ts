function requireEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

/** TCP port for the Hono API server. */
export const PORT = Number.parseInt(requireEnv("PORT"), 10);

/** Allowed origin for CORS (the shell's URL). */
export const SHELL_ORIGIN = requireEnv("SHELL_ORIGIN");

/** Path to the SQLite database file. */
export const DATABASE_URL = requireEnv("DATABASE_URL");

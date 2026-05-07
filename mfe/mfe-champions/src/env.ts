const processEnvValue = typeof process === "undefined" ? undefined : process.env?.RIFT_API_URL;
const viteEnvCandidate: unknown = import.meta.env.VITE_RIFT_API_URL;
const viteEnvValue = typeof viteEnvCandidate === "string" ? viteEnvCandidate : undefined;

/** Base URL of the Rift API server. */
export const RIFT_API_URL =
	typeof viteEnvValue === "string" && viteEnvValue.length > 0
		? viteEnvValue
		: (processEnvValue ?? "http://localhost:3100");

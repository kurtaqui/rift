import { cors } from "hono/cors";

import { SHELL_ORIGIN } from "../env";

/**
 * CORS allowing the shell origin to call the API with credentials so the
 * Auth.js cookie travels for guarded `/player/*` routes.
 */
export const corsMiddleware = cors({
	origin: [SHELL_ORIGIN],
	credentials: true,
	allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowHeaders: ["Content-Type", "Authorization"],
});

import { serve } from "@hono/node-server";

import { app } from "./app";
import { PORT } from "./env";

serve({ fetch: app.fetch, port: PORT }, info => {
	console.log(`@rift/api listening on http://localhost:${info.port}`);
});

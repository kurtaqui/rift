import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { DATABASE_URL } from "../env";
// oxlint-disable-next-line import/no-namespace -- Drizzle convention: namespaced schema barrel passed to drizzle({ schema })
import * as schema from "./schema";

mkdirSync(dirname(DATABASE_URL), { recursive: true });

const sqlite = new Database(DATABASE_URL);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
export { schema };

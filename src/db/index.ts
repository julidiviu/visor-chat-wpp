import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { DDL } from "./ddl";
import * as schema from "./schema";

export type DatabaseClient = {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
};

function create(): DatabaseClient {
  const file =
    process.env.WPP_DB_PATH ?? path.join(process.cwd(), "data", "app.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.exec(DDL);

  // Si la tabla FTS se creó después de existir mensajes, se reconstruye.
  const total = (
    sqlite.prepare("SELECT count(*) AS c FROM messages").get() as { c: number }
  ).c;
  const indexed = (
    sqlite.prepare("SELECT count(*) AS c FROM messages_fts").get() as {
      c: number;
    }
  ).c;
  if (total !== indexed) {
    sqlite.exec("INSERT INTO messages_fts(messages_fts) VALUES('rebuild')");
  }

  return { sqlite, db: drizzle(sqlite, { schema }) };
}

const globalForDb = globalThis as unknown as { __wppDb?: DatabaseClient };

export function getDb(): DatabaseClient {
  return (globalForDb.__wppDb ??= create());
}

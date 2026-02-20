import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { count } from "drizzle-orm";
import * as schema from "./schema";
import { seed, seedLabels } from "./seed";

type DB = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __db: DB | undefined;
  var __sqlite: Database.Database | undefined;
}

function ensureTables(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'todo',
      position INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS task_labels (
      task_id INTEGER NOT NULL,
      label_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, label_id)
    )
  `);
}

function initDb(): DB {
  if (global.__sqlite) {
    ensureTables(global.__sqlite);
    if (global.__db) return global.__db;
  }

  const dbPath = path.join(process.cwd(), "sqlite.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");

  ensureTables(sqlite);

  global.__sqlite = sqlite;
  global.__db = drizzle(sqlite, { schema });

  const [result] = global.__db
    .select({ count: count() })
    .from(schema.tasks)
    .all();
  if (result.count === 0) {
    seed();
  }

  const [labelResult] = global.__db
    .select({ count: count() })
    .from(schema.labels)
    .all();
  if (labelResult.count === 0) {
    seedLabels();
  }

  return global.__db;
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const instance = initDb();
    return (instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

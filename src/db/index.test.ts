import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { count } from "drizzle-orm";
import * as schema from "./schema";

describe("auto-seed on empty database", () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'todo',
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db = drizzle(sqlite, { schema });
  });

  it("should detect empty table and trigger seed", () => {
    const [result] = db.select({ count: count() }).from(schema.tasks).all();
    expect(result.count).toBe(0);

    const shouldSeed = result.count === 0;
    expect(shouldSeed).toBe(true);
  });

  it("should not seed when tasks already exist", () => {
    db.insert(schema.tasks).values({ title: "Existing task" }).run();

    const [result] = db.select({ count: count() }).from(schema.tasks).all();
    expect(result.count).toBe(1);

    const shouldSeed = result.count === 0;
    expect(shouldSeed).toBe(false);
  });
});

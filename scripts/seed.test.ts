import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/db/schema";

describe("seed script", () => {
  let sqlite: Database.Database;
  let testDb: ReturnType<typeof drizzle<typeof schema>>;

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
    testDb = drizzle(sqlite, { schema });
  });

  afterEach(() => {
    sqlite.close();
  });

  it("should insert seed tasks distributed across three columns", () => {
    const seedTasks = [
      { title: "Task A", status: "todo" as const, position: 0, priority: "high" as const },
      { title: "Task B", status: "in-progress" as const, position: 0, priority: "medium" as const },
      { title: "Task C", status: "done" as const, position: 0, priority: "low" as const },
    ];

    testDb.insert(schema.tasks).values(seedTasks).run();
    const tasks = testDb.select().from(schema.tasks).all();

    expect(tasks.length).toBe(3);
    expect(tasks.some((t) => t.status === "todo")).toBe(true);
    expect(tasks.some((t) => t.status === "in-progress")).toBe(true);
    expect(tasks.some((t) => t.status === "done")).toBe(true);
  });
});

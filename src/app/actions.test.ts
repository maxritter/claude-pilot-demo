import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createTask, updateTask, deleteTask, moveTask } from "./actions";

let testDb: ReturnType<typeof drizzle<typeof schema>>;
let sqlite: Database.Database;

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb;
  },
}));

beforeEach(() => {
  sqlite = new Database(":memory:");
  testDb = drizzle(sqlite, { schema });

  sqlite.exec(`
    CREATE TABLE tasks (
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
});

afterEach(() => {
  sqlite.close();
});

describe("createTask", () => {
  it("should create a task with default status todo", async () => {
    await createTask({ title: "Test Task", priority: "high" });

    const tasks = testDb.select().from(schema.tasks).all();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Test Task");
    expect(tasks[0].status).toBe("todo");
    expect(tasks[0].priority).toBe("high");
  });

  it("should set position as max + 1 in todo column", async () => {
    testDb.insert(schema.tasks).values({
      title: "Existing",
      status: "todo",
      position: 0,
    }).run();

    await createTask({ title: "New Task" });

    const tasks = testDb.select().from(schema.tasks).all();
    const newTask = tasks.find((t) => t.title === "New Task");
    expect(newTask?.position).toBe(1);
  });
});

describe("createTask", () => {
  it("should reject empty title at server level", async () => {
    await expect(createTask({ title: "   " })).rejects.toThrow("Title is required");

    const tasks = testDb.select().from(schema.tasks).all();
    expect(tasks).toHaveLength(0);
  });
});

describe("updateTask", () => {
  it("should update task fields", async () => {
    const result = testDb.insert(schema.tasks).values({
      title: "Original",
      description: "Original desc",
      priority: "low",
    }).returning().get();

    await updateTask(result.id, {
      title: "Updated",
      description: "Updated desc",
      priority: "high",
    });

    const updated = testDb.select().from(schema.tasks).where(
      eq(schema.tasks.id, result.id)
    ).get();
    expect(updated?.title).toBe("Updated");
    expect(updated?.description).toBe("Updated desc");
    expect(updated?.priority).toBe("high");
  });

  it("should throw when task does not exist", async () => {
    await expect(updateTask(999, { title: "Nope" })).rejects.toThrow("Task not found");
  });
});

describe("deleteTask", () => {
  it("should delete a task by id and recompute positions", async () => {
    testDb.insert(schema.tasks).values([
      { title: "Task A", status: "todo", position: 0 },
      { title: "Task B", status: "todo", position: 1 },
      { title: "Task C", status: "todo", position: 2 },
    ]).run();

    const taskB = testDb.select().from(schema.tasks)
      .where(eq(schema.tasks.title, "Task B")).get();
    if (!taskB) throw new Error("Task not found");

    await deleteTask(taskB.id);

    const remaining = testDb.select().from(schema.tasks)
      .where(eq(schema.tasks.status, "todo"))
      .orderBy(schema.tasks.position)
      .all();
    expect(remaining).toHaveLength(2);
    expect(remaining[0].title).toBe("Task A");
    expect(remaining[0].position).toBe(0);
    expect(remaining[1].title).toBe("Task C");
    expect(remaining[1].position).toBe(1);
  });

  it("should throw when task does not exist", async () => {
    await expect(deleteTask(999)).rejects.toThrow("Task not found");
  });
});

describe("moveTask", () => {
  it("should move task to different column and update positions", async () => {
    testDb.insert(schema.tasks).values([
      { title: "Todo 1", status: "todo", position: 0 },
      { title: "Todo 2", status: "todo", position: 1 },
    ]).run();

    const taskToMove = testDb.select().from(schema.tasks)
      .where(eq(schema.tasks.title, "Todo 1"))
      .get();

    if (!taskToMove) throw new Error("Task not found");

    await moveTask(taskToMove.id, "in-progress", 0);

    const movedTask = testDb.select().from(schema.tasks)
      .where(eq(schema.tasks.id, taskToMove.id))
      .get();
    expect(movedTask?.status).toBe("in-progress");
    expect(movedTask?.position).toBe(0);

    const todoTasks = testDb.select().from(schema.tasks)
      .where(eq(schema.tasks.status, "todo"))
      .orderBy(schema.tasks.position)
      .all();
    expect(todoTasks).toHaveLength(1);
    expect(todoTasks[0].title).toBe("Todo 2");
    expect(todoTasks[0].position).toBe(0);
  });

  it("should move task to an empty column", async () => {
    testDb.insert(schema.tasks).values([
      { title: "Lone Task", status: "todo", position: 0 },
    ]).run();

    const task = testDb.select().from(schema.tasks)
      .where(eq(schema.tasks.title, "Lone Task")).get();
    if (!task) throw new Error("Task not found");

    await moveTask(task.id, "done", 0);

    const movedTask = testDb.select().from(schema.tasks)
      .where(eq(schema.tasks.id, task.id)).get();
    expect(movedTask?.status).toBe("done");
    expect(movedTask?.position).toBe(0);

    const todoTasks = testDb.select().from(schema.tasks)
      .where(eq(schema.tasks.status, "todo")).all();
    expect(todoTasks).toHaveLength(0);
  });

  it("should throw when task does not exist", async () => {
    await expect(moveTask(999, "todo", 0)).rejects.toThrow("Task not found");
  });

  it("should handle same-column reordering", async () => {
    testDb.insert(schema.tasks).values([
      { title: "Task 1", status: "todo", position: 0 },
      { title: "Task 2", status: "todo", position: 1 },
      { title: "Task 3", status: "todo", position: 2 },
    ]).run();

    const task1 = testDb.select().from(schema.tasks)
      .where(eq(schema.tasks.title, "Task 1"))
      .get();

    if (!task1) throw new Error("Task not found");

    await moveTask(task1.id, "todo", 2);

    const tasks = testDb.select().from(schema.tasks)
      .where(eq(schema.tasks.status, "todo"))
      .orderBy(schema.tasks.position)
      .all();

    expect(tasks[0].title).toBe("Task 2");
    expect(tasks[0].position).toBe(0);
    expect(tasks[1].title).toBe("Task 3");
    expect(tasks[1].position).toBe(1);
    expect(tasks[2].title).toBe("Task 1");
    expect(tasks[2].position).toBe(2);
  });
});

describe("createTask with dueDate", () => {
  it("should create a task with a due date", async () => {
    await createTask({ title: "Task with due date", dueDate: "2026-03-15" });

    const tasks = testDb.select().from(schema.tasks).all();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].dueDate).toBe("2026-03-15");
  });

  it("should create a task without a due date (null in DB)", async () => {
    await createTask({ title: "Task without due date" });

    const tasks = testDb.select().from(schema.tasks).all();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].dueDate).toBeNull();
  });

  it("should reject a malformed due date", async () => {
    await expect(
      createTask({ title: "Bad date", dueDate: "not-a-date" })
    ).rejects.toThrow("Invalid due date format");
  });

  it("should reject a semantically invalid date like 2026-13-32", async () => {
    await expect(
      createTask({ title: "Bad date", dueDate: "2026-13-32" })
    ).rejects.toThrow("Invalid due date format");
  });
});

describe("updateTask with dueDate", () => {
  it("should set a due date on an existing task", async () => {
    const result = testDb
      .insert(schema.tasks)
      .values({ title: "Original", position: 0 })
      .returning()
      .get();

    await updateTask(result.id, { dueDate: "2026-04-01" });

    const updated = testDb
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, result.id))
      .get();
    expect(updated?.dueDate).toBe("2026-04-01");
  });

  it("should clear a due date when set to null", async () => {
    const result = testDb
      .insert(schema.tasks)
      .values({ title: "Original", position: 0, dueDate: "2026-03-15" })
      .returning()
      .get();

    await updateTask(result.id, { dueDate: null });

    const updated = testDb
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, result.id))
      .get();
    expect(updated?.dueDate).toBeNull();
  });

  it("should preserve an existing due date when dueDate is not provided", async () => {
    const result = testDb
      .insert(schema.tasks)
      .values({ title: "Original", position: 0, dueDate: "2026-03-15" })
      .returning()
      .get();

    await updateTask(result.id, { title: "Updated title" });

    const updated = testDb
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, result.id))
      .get();
    expect(updated?.dueDate).toBe("2026-03-15");
  });
});

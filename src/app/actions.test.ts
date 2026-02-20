import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createTask, updateTask, deleteTask, moveTask } from "./actions";
import {
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  moveSubtask,
} from "./subtask-actions";
import {
  createLabel,
  updateLabel,
  deleteLabel,
  getLabels,
  addLabelToTask,
  removeLabelFromTask,
  getTaskLabels,
  getAllTaskLabels,
} from "./label-actions";

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

function createTestSchema(db: Database.Database) {
  db.exec(`
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

  db.exec(`
    CREATE TABLE subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.exec(`
    CREATE TABLE labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE task_labels (
      task_id INTEGER NOT NULL,
      label_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, label_id)
    )
  `);
}

beforeEach(() => {
  sqlite = new Database(":memory:");
  testDb = drizzle(sqlite, { schema });
  createTestSchema(sqlite);
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

describe("createTask - validation", () => {
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

  it("should cascade delete subtasks when task is deleted", async () => {
    const task = testDb.insert(schema.tasks).values({
      title: "Task with subtasks",
      status: "todo",
      position: 0,
    }).returning().get();

    testDb.insert(schema.subtasks).values([
      { taskId: task.id, title: "Subtask 1", position: 0 },
      { taskId: task.id, title: "Subtask 2", position: 1 },
    ]).run();

    await deleteTask(task.id);

    const remaining = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.taskId, task.id)).all();
    expect(remaining).toHaveLength(0);
  });

  it("should cascade delete task_labels when task is deleted", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "T", status: "todo", position: 0 }).returning().get();
    const label = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    testDb.insert(schema.taskLabels).values({ taskId: task.id, labelId: label.id }).run();
    await deleteTask(task.id);
    const rows = testDb.select().from(schema.taskLabels).all();
    expect(rows).toHaveLength(0);
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

describe("createSubtask", () => {
  it("should create a subtask with position 0 when none exist", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "Parent Task" }).returning().get();

    await createSubtask(task.id, "First subtask");

    const subtasks = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.taskId, task.id)).all();
    expect(subtasks).toHaveLength(1);
    expect(subtasks[0].title).toBe("First subtask");
    expect(subtasks[0].completed).toBe(false);
    expect(subtasks[0].position).toBe(0);
  });

  it("should set position as max + 1 when subtasks exist", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "Parent Task" }).returning().get();
    testDb.insert(schema.subtasks).values([
      { taskId: task.id, title: "Sub 1", position: 0 },
      { taskId: task.id, title: "Sub 2", position: 1 },
    ]).run();

    await createSubtask(task.id, "Sub 3");

    const subtask = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.title, "Sub 3")).get();
    expect(subtask?.position).toBe(2);
  });

  it("should reject empty title", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "Parent Task" }).returning().get();
    await expect(createSubtask(task.id, "   ")).rejects.toThrow("Subtask title is required");
  });

  it("should reject if parent task does not exist", async () => {
    await expect(createSubtask(999, "Orphan subtask")).rejects.toThrow("Task not found");
  });
});

describe("toggleSubtask", () => {
  it("should mark subtask as completed", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "Task" }).returning().get();
    const subtask = testDb.insert(schema.subtasks).values({
      taskId: task.id, title: "Sub", position: 0,
    }).returning().get();

    await toggleSubtask(subtask.id, true);

    const updated = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.id, subtask.id)).get();
    expect(updated?.completed).toBe(true);
  });

  it("should mark subtask as incomplete", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "Task" }).returning().get();
    const subtask = testDb.insert(schema.subtasks).values({
      taskId: task.id, title: "Sub", completed: true, position: 0,
    }).returning().get();

    await toggleSubtask(subtask.id, false);

    const updated = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.id, subtask.id)).get();
    expect(updated?.completed).toBe(false);
  });

  it("should throw when subtask does not exist", async () => {
    await expect(toggleSubtask(999, true)).rejects.toThrow("Subtask not found");
  });
});

describe("deleteSubtask", () => {
  it("should delete subtask and recompute positions", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "Task" }).returning().get();
    testDb.insert(schema.subtasks).values([
      { taskId: task.id, title: "Sub A", position: 0 },
      { taskId: task.id, title: "Sub B", position: 1 },
      { taskId: task.id, title: "Sub C", position: 2 },
    ]).run();

    const subB = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.title, "Sub B")).get();
    if (!subB) throw new Error("Subtask not found");

    await deleteSubtask(subB.id);

    const remaining = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.taskId, task.id))
      .orderBy(schema.subtasks.position)
      .all();
    expect(remaining).toHaveLength(2);
    expect(remaining[0].title).toBe("Sub A");
    expect(remaining[0].position).toBe(0);
    expect(remaining[1].title).toBe("Sub C");
    expect(remaining[1].position).toBe(1);
  });

  it("should throw when subtask does not exist", async () => {
    await expect(deleteSubtask(999)).rejects.toThrow("Subtask not found");
  });
});

describe("moveSubtask", () => {
  it("should reorder subtasks within parent task", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "Task" }).returning().get();
    testDb.insert(schema.subtasks).values([
      { taskId: task.id, title: "Sub 1", position: 0 },
      { taskId: task.id, title: "Sub 2", position: 1 },
      { taskId: task.id, title: "Sub 3", position: 2 },
    ]).run();

    const sub1 = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.title, "Sub 1")).get();
    if (!sub1) throw new Error("Subtask not found");

    await moveSubtask(sub1.id, 2);

    const reordered = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.taskId, task.id))
      .orderBy(schema.subtasks.position)
      .all();
    expect(reordered[0].title).toBe("Sub 2");
    expect(reordered[0].position).toBe(0);
    expect(reordered[1].title).toBe("Sub 3");
    expect(reordered[1].position).toBe(1);
    expect(reordered[2].title).toBe("Sub 1");
    expect(reordered[2].position).toBe(2);
  });

  it("should clamp out-of-bounds position to last valid index", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "Task" }).returning().get();
    testDb.insert(schema.subtasks).values([
      { taskId: task.id, title: "Sub 1", position: 0 },
      { taskId: task.id, title: "Sub 2", position: 1 },
    ]).run();

    const sub1 = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.title, "Sub 1")).get();
    if (!sub1) throw new Error("Subtask not found");

    await moveSubtask(sub1.id, 99);

    const reordered = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.taskId, task.id))
      .orderBy(schema.subtasks.position)
      .all();
    expect(reordered[0].title).toBe("Sub 2");
    expect(reordered[1].title).toBe("Sub 1");
  });

  it("should clamp negative position to zero", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "Task" }).returning().get();
    testDb.insert(schema.subtasks).values([
      { taskId: task.id, title: "Sub 1", position: 0 },
      { taskId: task.id, title: "Sub 2", position: 1 },
      { taskId: task.id, title: "Sub 3", position: 2 },
    ]).run();

    const sub3 = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.title, "Sub 3")).get();
    if (!sub3) throw new Error("Subtask not found");

    await moveSubtask(sub3.id, -5);

    const reordered = testDb.select().from(schema.subtasks)
      .where(eq(schema.subtasks.taskId, task.id))
      .orderBy(schema.subtasks.position)
      .all();
    expect(reordered[0].title).toBe("Sub 3");
    expect(reordered[0].position).toBe(0);
  });

  it("should throw when subtask does not exist", async () => {
    await expect(moveSubtask(999, 0)).rejects.toThrow("Subtask not found");
  });
});

describe("createLabel", () => {
  it("should create a label with valid name and color", async () => {
    await createLabel({ name: "Bug", color: "red" });
    const result = testDb.select().from(schema.labels).all();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bug");
    expect(result[0].color).toBe("red");
  });

  it("should reject empty name", async () => {
    await expect(createLabel({ name: "   ", color: "blue" })).rejects.toThrow("Label name is required");
  });

  it("should reject invalid color", async () => {
    await expect(createLabel({ name: "Bug", color: "magenta" as "red" })).rejects.toThrow("Invalid label color");
  });
});

describe("updateLabel", () => {
  it("should update label name and color", async () => {
    const label = testDb.insert(schema.labels).values({ name: "Old", color: "red" }).returning().get();
    await updateLabel(label.id, { name: "New", color: "blue" });
    const updated = testDb.select().from(schema.labels).where(eq(schema.labels.id, label.id)).get();
    expect(updated?.name).toBe("New");
    expect(updated?.color).toBe("blue");
  });

  it("should throw when label does not exist", async () => {
    await expect(updateLabel(999, { name: "Nope" })).rejects.toThrow("Label not found");
  });

  it("should reject invalid color", async () => {
    const label = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    await expect(updateLabel(label.id, { color: "magenta" as "red" })).rejects.toThrow("Invalid label color");
  });

  it("should reject empty name", async () => {
    const label = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    await expect(updateLabel(label.id, { name: "   " })).rejects.toThrow("Label name is required");
  });
});

describe("deleteLabel", () => {
  it("should delete a label", async () => {
    const label = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    await deleteLabel(label.id);
    const result = testDb.select().from(schema.labels).all();
    expect(result).toHaveLength(0);
  });

  it("should cascade delete task_labels", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "Task A", status: "todo", position: 0 }).returning().get();
    const label = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    testDb.insert(schema.taskLabels).values({ taskId: task.id, labelId: label.id }).run();

    await deleteLabel(label.id);

    const taskLabelRows = testDb.select().from(schema.taskLabels).all();
    expect(taskLabelRows).toHaveLength(0);
  });

  it("should throw when label does not exist", async () => {
    await expect(deleteLabel(999)).rejects.toThrow("Label not found");
  });
});

describe("getLabels", () => {
  it("should return all labels ordered by id", async () => {
    testDb.insert(schema.labels).values([
      { name: "Bug", color: "red" },
      { name: "Feature", color: "blue" },
    ]).run();
    const result = await getLabels();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Bug");
    expect(result[1].name).toBe("Feature");
  });

  it("should return empty array when no labels", async () => {
    const result = await getLabels();
    expect(result).toHaveLength(0);
  });
});

describe("addLabelToTask", () => {
  it("should create a task-label association", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "T", status: "todo", position: 0 }).returning().get();
    const label = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    await addLabelToTask(task.id, label.id);
    const rows = testDb.select().from(schema.taskLabels).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].taskId).toBe(task.id);
    expect(rows[0].labelId).toBe(label.id);
  });

  it("should be idempotent — adding the same association twice does not error", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "T", status: "todo", position: 0 }).returning().get();
    const label = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    await addLabelToTask(task.id, label.id);
    await addLabelToTask(task.id, label.id);
    const rows = testDb.select().from(schema.taskLabels).all();
    expect(rows).toHaveLength(1);
  });

  it("should throw when task does not exist", async () => {
    const label = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    await expect(addLabelToTask(999, label.id)).rejects.toThrow("Task not found");
  });

  it("should throw when label does not exist", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "T", status: "todo", position: 0 }).returning().get();
    await expect(addLabelToTask(task.id, 999)).rejects.toThrow("Label not found");
  });
});

describe("removeLabelFromTask", () => {
  it("should remove a task-label association", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "T", status: "todo", position: 0 }).returning().get();
    const label = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    testDb.insert(schema.taskLabels).values({ taskId: task.id, labelId: label.id }).run();
    await removeLabelFromTask(task.id, label.id);
    const rows = testDb.select().from(schema.taskLabels).all();
    expect(rows).toHaveLength(0);
  });

  it("should be idempotent — removing non-existent association does not error", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "T", status: "todo", position: 0 }).returning().get();
    const label = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    await expect(removeLabelFromTask(task.id, label.id)).resolves.toBeUndefined();
  });
});

describe("getTaskLabels", () => {
  it("should return labels for a specific task", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "T", status: "todo", position: 0 }).returning().get();
    const label = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    testDb.insert(schema.taskLabels).values({ taskId: task.id, labelId: label.id }).run();
    const result = await getTaskLabels(task.id);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bug");
  });

  it("should return empty array when task has no labels", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "T", status: "todo", position: 0 }).returning().get();
    const result = await getTaskLabels(task.id);
    expect(result).toHaveLength(0);
  });
});

describe("getAllTaskLabels", () => {
  it("should return all task-label associations", async () => {
    const task = testDb.insert(schema.tasks).values({ title: "T", status: "todo", position: 0 }).returning().get();
    const l1 = testDb.insert(schema.labels).values({ name: "Bug", color: "red" }).returning().get();
    const l2 = testDb.insert(schema.labels).values({ name: "Feature", color: "blue" }).returning().get();
    testDb.insert(schema.taskLabels).values([
      { taskId: task.id, labelId: l1.id },
      { taskId: task.id, labelId: l2.id },
    ]).run();
    const result = await getAllTaskLabels();
    expect(result).toHaveLength(2);
  });
});

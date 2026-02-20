import { describe, it, expect } from "vitest";

// Note: React component DnD behavior is tested via E2E (playwright-cli)

type Task = {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in-progress" | "done";
  position: number;
  dueDate: string | null;
  createdAt: string;
};

function groupTasksByStatus(taskList: Task[]) {
  return {
    todo: taskList.filter((task) => task.status === "todo").sort((a, b) => a.position - b.position),
    "in-progress": taskList.filter((task) => task.status === "in-progress").sort((a, b) => a.position - b.position),
    done: taskList.filter((task) => task.status === "done").sort((a, b) => a.position - b.position),
  };
}

const baseTasks: Task[] = [
  { id: 1, title: "Task A", description: "", priority: "high", status: "todo", position: 1, dueDate: null, createdAt: "" },
  { id: 2, title: "Task B", description: "", priority: "medium", status: "in-progress", position: 0, dueDate: null, createdAt: "" },
  { id: 3, title: "Task C", description: "", priority: "low", status: "done", position: 0, dueDate: null, createdAt: "" },
  { id: 4, title: "Task D", description: "", priority: "high", status: "todo", position: 0, dueDate: null, createdAt: "" },
];

type Status = "todo" | "in-progress" | "done";
type GroupedTasks = Record<Status, Task[]>;
type SortState = Record<Status, boolean>;

function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function sortColumnByDueDate(tasks: Task[]): Task[] {
  const withDate = tasks
    .filter((t) => t.dueDate)
    .sort(
      (a, b) =>
        parseDateLocal(a.dueDate!).getTime() -
        parseDateLocal(b.dueDate!).getTime(),
    );
  const withoutDate = tasks.filter((t) => !t.dueDate);
  return [...withDate, ...withoutDate];
}

function applySort(grouped: GroupedTasks, sort: SortState): GroupedTasks {
  return {
    todo: sort.todo ? sortColumnByDueDate(grouped.todo) : grouped.todo,
    "in-progress": sort["in-progress"]
      ? sortColumnByDueDate(grouped["in-progress"])
      : grouped["in-progress"],
    done: sort.done ? sortColumnByDueDate(grouped.done) : grouped.done,
  };
}

describe("groupTasksByStatus", () => {
  it("should group tasks by status into three columns", () => {
    const result = groupTasksByStatus(baseTasks);

    expect(result.todo).toHaveLength(2);
    expect(result["in-progress"]).toHaveLength(1);
    expect(result.done).toHaveLength(1);
  });

  it("should sort tasks within each column by position ascending", () => {
    const result = groupTasksByStatus(baseTasks);

    expect(result.todo[0].id).toBe(4);
    expect(result.todo[1].id).toBe(1);
  });

  it("should return empty arrays for columns with no tasks", () => {
    const todoOnly: Task[] = [
      { id: 1, title: "Only todo", description: "", priority: "low", status: "todo", position: 0, dueDate: null, createdAt: "" },
    ];

    const result = groupTasksByStatus(todoOnly);

    expect(result.todo).toHaveLength(1);
    expect(result["in-progress"]).toHaveLength(0);
    expect(result.done).toHaveLength(0);
  });

  it("should handle empty task list", () => {
    const result = groupTasksByStatus([]);

    expect(result.todo).toHaveLength(0);
    expect(result["in-progress"]).toHaveLength(0);
    expect(result.done).toHaveLength(0);
  });
});

const sortTasks: Task[] = [
  { id: 1, title: "No date", description: "", priority: "low", status: "todo", position: 0, dueDate: null, createdAt: "" },
  { id: 2, title: "Far", description: "", priority: "low", status: "todo", position: 1, dueDate: "2026-03-15", createdAt: "" },
  { id: 3, title: "Soon", description: "", priority: "low", status: "todo", position: 2, dueDate: "2026-02-21", createdAt: "" },
  { id: 4, title: "Mid", description: "", priority: "low", status: "todo", position: 3, dueDate: "2026-03-01", createdAt: "" },
];

describe("sortColumnByDueDate", () => {
  it("should sort tasks with due dates ascending, nulls last", () => {
    const sorted = sortColumnByDueDate(sortTasks);

    expect(sorted.map((t) => t.id)).toEqual([3, 4, 2, 1]);
  });

  it("should preserve relative order of tasks without due dates", () => {
    const tasksWithMultipleNulls: Task[] = [
      { id: 10, title: "Null A", description: "", priority: "low", status: "todo", position: 0, dueDate: null, createdAt: "" },
      { id: 11, title: "Dated", description: "", priority: "low", status: "todo", position: 1, dueDate: "2026-03-01", createdAt: "" },
      { id: 12, title: "Null B", description: "", priority: "low", status: "todo", position: 2, dueDate: null, createdAt: "" },
    ];
    const sorted = sortColumnByDueDate(tasksWithMultipleNulls);

    expect(sorted.map((t) => t.id)).toEqual([11, 10, 12]);
  });
});

describe("applySort", () => {
  const noSort: SortState = { todo: false, "in-progress": false, done: false };
  const sortTodo: SortState = { todo: true, "in-progress": false, done: false };

  it("should not change order when sort is off", () => {
    const grouped = groupTasksByStatus(sortTasks);
    const result = applySort(grouped, noSort);

    expect(result.todo.map((t) => t.id)).toEqual([1, 2, 3, 4]);
  });

  it("should sort todo column when sort is on", () => {
    const grouped = groupTasksByStatus(sortTasks);
    const result = applySort(grouped, sortTodo);

    expect(result.todo.map((t) => t.id)).toEqual([3, 4, 2, 1]);
  });

  it("should restore position order when toggling sort off (re-deriving from source)", () => {
    const grouped = groupTasksByStatus(sortTasks);
    const sorted = applySort(grouped, sortTodo);
    expect(sorted.todo.map((t) => t.id)).toEqual([3, 4, 2, 1]);

    const restored = applySort(groupTasksByStatus(sortTasks), noSort);
    expect(restored.todo.map((t) => t.id)).toEqual([1, 2, 3, 4]);
  });
});

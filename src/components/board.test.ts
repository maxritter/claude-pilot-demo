import { describe, it, expect } from "vitest";

// Note: React component DnD behavior is tested via E2E (playwright-cli)

type Task = {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in-progress" | "done";
  position: number;
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
  { id: 1, title: "Task A", description: "", priority: "high", status: "todo", position: 1, createdAt: "" },
  { id: 2, title: "Task B", description: "", priority: "medium", status: "in-progress", position: 0, createdAt: "" },
  { id: 3, title: "Task C", description: "", priority: "low", status: "done", position: 0, createdAt: "" },
  { id: 4, title: "Task D", description: "", priority: "high", status: "todo", position: 0, createdAt: "" },
];

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
      { id: 1, title: "Only todo", description: "", priority: "low", status: "todo", position: 0, createdAt: "" },
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

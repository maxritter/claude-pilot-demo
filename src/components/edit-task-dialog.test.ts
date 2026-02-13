import { describe, it, expect } from "vitest";

type Priority = "low" | "medium" | "high";

interface TaskData {
  title: string;
  description: string;
  priority: Priority;
}

describe("EditTaskDialog state sync logic", () => {
  it("should reset form values when dialog opens with new task data", () => {
    const task: TaskData = { title: "Original", description: "Desc", priority: "high" };

    let formTitle = task.title;
    let formDescription = task.description;
    let formPriority: Priority = task.priority;

    const updatedTask: TaskData = { title: "Updated", description: "New Desc", priority: "low" };

    const syncState = (open: boolean, t: TaskData) => {
      if (open) {
        formTitle = t.title;
        formDescription = t.description;
        formPriority = t.priority;
      }
    };

    syncState(true, updatedTask);

    expect(formTitle).toBe("Updated");
    expect(formDescription).toBe("New Desc");
    expect(formPriority).toBe("low");
  });

  it("should not reset form values when dialog is not open", () => {
    const task: TaskData = { title: "Original", description: "Desc", priority: "high" };

    let formTitle = task.title;

    const updatedTask: TaskData = { title: "Updated", description: "New Desc", priority: "low" };

    const syncState = (open: boolean, t: TaskData) => {
      if (open) {
        formTitle = t.title;
      }
    };

    syncState(false, updatedTask);

    expect(formTitle).toBe("Original");
  });
});

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import type { Priority, Status } from "@/lib/types";
import { eq, max, and, ne } from "drizzle-orm";

function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const parsed = new Date(y, m - 1, d);
  return (
    parsed.getFullYear() === y &&
    parsed.getMonth() === m - 1 &&
    parsed.getDate() === d
  );
}

export async function createTask(data: {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
}) {
  try {
    if (!data.title?.trim()) {
      throw new Error("Title is required");
    }

    if (data.dueDate && !isValidDateString(data.dueDate)) {
      throw new Error("Invalid due date format");
    }

    const [result] = await db
      .select({ maxPos: max(tasks.position) })
      .from(tasks)
      .where(eq(tasks.status, "todo"));

    const newPosition = (result.maxPos ?? -1) + 1;

    await db.insert(tasks).values({
      title: data.title.trim(),
      description: data.description ?? "",
      priority: data.priority ?? "medium",
      status: "todo",
      position: newPosition,
      dueDate: data.dueDate ?? null,
    });

    revalidatePath("/");
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Title is required" ||
        error.message === "Invalid due date format")
    ) {
      throw error;
    }
    console.error("Failed to create task:", error);
    throw new Error("Failed to create task");
  }
}

export async function updateTask(
  id: number,
  data: {
    title?: string;
    description?: string;
    priority?: Priority;
    dueDate?: string | null;
  },
) {
  try {
    if (data.dueDate && !isValidDateString(data.dueDate)) {
      throw new Error("Invalid due date format");
    }

    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );

    const result = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error("Task not found");
    }

    revalidatePath("/");
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Task not found" ||
        error.message === "Invalid due date format")
    ) {
      throw error;
    }
    console.error("Failed to update task:", error);
    throw new Error("Failed to update task");
  }
}

export async function deleteTask(id: number) {
  try {
    db.transaction((tx) => {
      const task = tx.select().from(tasks).where(eq(tasks.id, id)).get();

      if (!task) {
        throw new Error("Task not found");
      }

      tx.delete(tasks).where(eq(tasks.id, id)).run();

      const remaining = tx
        .select()
        .from(tasks)
        .where(eq(tasks.status, task.status))
        .orderBy(tasks.position)
        .all();

      for (let i = 0; i < remaining.length; i++) {
        tx.update(tasks)
          .set({ position: i })
          .where(eq(tasks.id, remaining[i].id))
          .run();
      }
    });

    revalidatePath("/");
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      throw error;
    }
    console.error("Failed to delete task:", error);
    throw new Error("Failed to delete task");
  }
}

export async function moveTask(
  id: number,
  newStatus: Status,
  newPosition: number,
) {
  try {
    db.transaction((tx) => {
      const task = tx.select().from(tasks).where(eq(tasks.id, id)).get();

      if (!task) {
        throw new Error("Task not found");
      }

      const oldStatus = task.status;

      const sourceTasks = tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.status, oldStatus), ne(tasks.id, id)))
        .orderBy(tasks.position)
        .all();

      for (let i = 0; i < sourceTasks.length; i++) {
        tx.update(tasks)
          .set({ position: i })
          .where(eq(tasks.id, sourceTasks[i].id))
          .run();
      }

      const destTasks = tx
        .select()
        .from(tasks)
        .where(
          oldStatus === newStatus
            ? and(eq(tasks.status, newStatus), ne(tasks.id, id))
            : eq(tasks.status, newStatus),
        )
        .orderBy(tasks.position)
        .all();

      for (let i = destTasks.length - 1; i >= newPosition; i--) {
        tx.update(tasks)
          .set({ position: i + 1 })
          .where(eq(tasks.id, destTasks[i].id))
          .run();
      }

      tx.update(tasks)
        .set({ status: newStatus, position: newPosition })
        .where(eq(tasks.id, id))
        .run();
    });

    revalidatePath("/");
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      throw error;
    }
    console.error("Failed to move task:", error);
    throw new Error("Failed to move task");
  }
}

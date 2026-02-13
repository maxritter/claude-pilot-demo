"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import type { Priority, Status } from "@/lib/types";
import { eq, max, and, ne } from "drizzle-orm";

export async function createTask(data: {
  title: string;
  description?: string;
  priority?: Priority;
}) {
  try {
    if (!data.title?.trim()) {
      throw new Error("Title is required");
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
    });

    revalidatePath("/");
  } catch (error) {
    if (error instanceof Error && error.message === "Title is required") {
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
  }
) {
  try {
    const result = await db
      .update(tasks)
      .set(data)
      .where(eq(tasks.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error("Task not found");
    }

    revalidatePath("/");
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
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
  newPosition: number
) {
  try {
    db.transaction((tx) => {
      const task = tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, id))
        .get();

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
        tx
          .update(tasks)
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
            : eq(tasks.status, newStatus)
        )
        .orderBy(tasks.position)
        .all();

      for (let i = destTasks.length - 1; i >= newPosition; i--) {
        tx
          .update(tasks)
          .set({ position: i + 1 })
          .where(eq(tasks.id, destTasks[i].id))
          .run();
      }

      tx
        .update(tasks)
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

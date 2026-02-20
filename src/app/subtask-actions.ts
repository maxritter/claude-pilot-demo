"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks, subtasks } from "@/db/schema";
import { eq, max, and, ne } from "drizzle-orm";

export async function createSubtask(taskId: number, title: string) {
  try {
    if (!title?.trim()) {
      throw new Error("Subtask title is required");
    }

    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .then((r) => r[0]);
    if (!task) {
      throw new Error("Task not found");
    }

    const [result] = await db
      .select({ maxPos: max(subtasks.position) })
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId));

    const newPosition = (result.maxPos ?? -1) + 1;

    await db.insert(subtasks).values({
      taskId,
      title: title.trim(),
      completed: false,
      position: newPosition,
    });

    revalidatePath("/");
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Subtask title is required" ||
        error.message === "Task not found")
    ) {
      throw error;
    }
    console.error("Failed to create subtask:", error);
    throw new Error("Failed to create subtask");
  }
}

export async function toggleSubtask(id: number, completed: boolean) {
  try {
    const result = await db
      .update(subtasks)
      .set({ completed })
      .where(eq(subtasks.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error("Subtask not found");
    }

    revalidatePath("/");
  } catch (error) {
    if (error instanceof Error && error.message === "Subtask not found") {
      throw error;
    }
    console.error("Failed to toggle subtask:", error);
    throw new Error("Failed to toggle subtask");
  }
}

export async function deleteSubtask(id: number) {
  try {
    db.transaction((tx) => {
      const subtask = tx
        .select()
        .from(subtasks)
        .where(eq(subtasks.id, id))
        .get();

      if (!subtask) {
        throw new Error("Subtask not found");
      }

      tx.delete(subtasks).where(eq(subtasks.id, id)).run();

      const remaining = tx
        .select()
        .from(subtasks)
        .where(eq(subtasks.taskId, subtask.taskId))
        .orderBy(subtasks.position)
        .all();

      for (let i = 0; i < remaining.length; i++) {
        tx.update(subtasks)
          .set({ position: i })
          .where(eq(subtasks.id, remaining[i].id))
          .run();
      }
    });

    revalidatePath("/");
  } catch (error) {
    if (error instanceof Error && error.message === "Subtask not found") {
      throw error;
    }
    console.error("Failed to delete subtask:", error);
    throw new Error("Failed to delete subtask");
  }
}

export async function moveSubtask(id: number, newPosition: number) {
  try {
    db.transaction((tx) => {
      const subtask = tx
        .select()
        .from(subtasks)
        .where(eq(subtasks.id, id))
        .get();

      if (!subtask) {
        throw new Error("Subtask not found");
      }

      const siblings = tx
        .select()
        .from(subtasks)
        .where(and(eq(subtasks.taskId, subtask.taskId), ne(subtasks.id, id)))
        .orderBy(subtasks.position)
        .all();

      const clampedPosition = Math.max(
        0,
        Math.min(newPosition, siblings.length),
      );

      for (let i = 0; i < clampedPosition; i++) {
        tx.update(subtasks)
          .set({ position: i })
          .where(eq(subtasks.id, siblings[i].id))
          .run();
      }

      for (let i = siblings.length - 1; i >= clampedPosition; i--) {
        tx.update(subtasks)
          .set({ position: i + 1 })
          .where(eq(subtasks.id, siblings[i].id))
          .run();
      }

      tx.update(subtasks)
        .set({ position: clampedPosition })
        .where(eq(subtasks.id, id))
        .run();
    });

    revalidatePath("/");
  } catch (error) {
    if (error instanceof Error && error.message === "Subtask not found") {
      throw error;
    }
    console.error("Failed to move subtask:", error);
    throw new Error("Failed to move subtask");
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks, labels, taskLabels, LABEL_COLOR_VALUES } from "@/db/schema";
import type { LabelColor, Label } from "@/lib/types";
import { eq, and, asc } from "drizzle-orm";

export async function createLabel(data: { name: string; color: LabelColor }) {
  try {
    if (!data.name?.trim()) {
      throw new Error("Label name is required");
    }
    if (!LABEL_COLOR_VALUES.includes(data.color)) {
      throw new Error("Invalid label color");
    }
    await db
      .insert(labels)
      .values({ name: data.name.trim(), color: data.color });
    revalidatePath("/");
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Label name is required" ||
        error.message === "Invalid label color")
    ) {
      throw error;
    }
    console.error("Failed to create label:", error);
    throw new Error("Failed to create label");
  }
}

export async function updateLabel(
  id: number,
  data: { name?: string; color?: LabelColor },
) {
  try {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Label name is required");
    }
    if (data.color && !LABEL_COLOR_VALUES.includes(data.color)) {
      throw new Error("Invalid label color");
    }
    const result = await db
      .update(labels)
      .set(data)
      .where(eq(labels.id, id))
      .returning();
    if (result.length === 0) {
      throw new Error("Label not found");
    }
    revalidatePath("/");
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Label not found" ||
        error.message === "Label name is required" ||
        error.message === "Invalid label color")
    ) {
      throw error;
    }
    console.error("Failed to update label:", error);
    throw new Error("Failed to update label");
  }
}

export async function deleteLabel(id: number) {
  try {
    db.transaction((tx) => {
      const label = tx.select().from(labels).where(eq(labels.id, id)).get();
      if (!label) {
        throw new Error("Label not found");
      }
      tx.delete(taskLabels).where(eq(taskLabels.labelId, id)).run();
      tx.delete(labels).where(eq(labels.id, id)).run();
    });
    revalidatePath("/");
  } catch (error) {
    if (error instanceof Error && error.message === "Label not found") {
      throw error;
    }
    console.error("Failed to delete label:", error);
    throw new Error("Failed to delete label");
  }
}

export async function getLabels(): Promise<Label[]> {
  return db.select().from(labels).orderBy(asc(labels.id)).all();
}

export async function addLabelToTask(taskId: number, labelId: number) {
  try {
    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .get();
    if (!task) throw new Error("Task not found");
    const label = await db
      .select()
      .from(labels)
      .where(eq(labels.id, labelId))
      .get();
    if (!label) throw new Error("Label not found");
    const existing = await db
      .select()
      .from(taskLabels)
      .where(
        and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)),
      )
      .get();
    if (!existing) {
      await db.insert(taskLabels).values({ taskId, labelId });
    }
    revalidatePath("/");
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Task not found" ||
        error.message === "Label not found")
    ) {
      throw error;
    }
    console.error("Failed to add label to task:", error);
    throw new Error("Failed to add label to task");
  }
}

export async function removeLabelFromTask(taskId: number, labelId: number) {
  try {
    await db
      .delete(taskLabels)
      .where(
        and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)),
      );
    revalidatePath("/");
  } catch (error) {
    console.error("Failed to remove label from task:", error);
    throw new Error("Failed to remove label from task");
  }
}

export async function getTaskLabels(taskId: number): Promise<Label[]> {
  const rows = await db
    .select({ label: labels })
    .from(taskLabels)
    .innerJoin(labels, eq(taskLabels.labelId, labels.id))
    .where(eq(taskLabels.taskId, taskId))
    .all();
  return rows.map((r) => r.label);
}

export async function getAllTaskLabels(): Promise<
  { taskId: number; labelId: number }[]
> {
  return db
    .select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId })
    .from(taskLabels)
    .all();
}

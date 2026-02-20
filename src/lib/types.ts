import type { Subtask } from "@/db/schema";

export type { Task, NewTask, Subtask, NewSubtask, Priority, Status, Label, NewLabel, LabelColor, TaskLabel } from "@/db/schema";
export type SubtasksMap = Record<number, Subtask[]>;

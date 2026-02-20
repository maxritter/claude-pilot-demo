import type { Subtask } from "@/db/schema";

export type { Task, NewTask, Subtask, NewSubtask, Priority, Status } from "@/db/schema";
export type SubtasksMap = Record<number, Subtask[]>;

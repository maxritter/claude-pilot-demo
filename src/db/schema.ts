import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  priority: text("priority", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),
  status: text("status", { enum: ["todo", "in-progress", "done"] })
    .notNull()
    .default("todo"),
  position: integer("position").notNull().default(0),
  dueDate: text("due_date"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const subtasks = sqliteTable("subtasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull().default(0),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Subtask = typeof subtasks.$inferSelect;
export type NewSubtask = typeof subtasks.$inferInsert;
export type Priority = "low" | "medium" | "high";
export type Status = "todo" | "in-progress" | "done";

export const LABEL_COLOR_VALUES = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "gray",
] as const;
export type LabelColor = (typeof LABEL_COLOR_VALUES)[number];

export const labels = sqliteTable("labels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color", { enum: LABEL_COLOR_VALUES }).notNull(),
});

export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;

export const taskLabels = sqliteTable(
  "task_labels",
  {
    taskId: integer("task_id").notNull(),
    labelId: integer("label_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.labelId] })],
);

export type TaskLabel = typeof taskLabels.$inferSelect;

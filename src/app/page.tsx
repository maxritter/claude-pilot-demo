import { db } from "@/db";
import { tasks, subtasks } from "@/db/schema";
import { BoardWrapper } from "@/components/board-wrapper";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { asc } from "drizzle-orm";
import type { SubtasksMap } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const allTasks = await db.select().from(tasks).orderBy(asc(tasks.position));

  const allSubtasks = await db
    .select()
    .from(subtasks)
    .orderBy(asc(subtasks.position));

  const subtasksMap: SubtasksMap = {};
  for (const subtask of allSubtasks) {
    if (!subtasksMap[subtask.taskId]) {
      subtasksMap[subtask.taskId] = [];
    }
    subtasksMap[subtask.taskId].push(subtask);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Awesome Task Board</h1>
          <CreateTaskDialog />
        </div>
      </header>
      <main className="flex-1 p-6">
        <BoardWrapper tasks={allTasks} subtasksMap={subtasksMap} />
      </main>
    </div>
  );
}

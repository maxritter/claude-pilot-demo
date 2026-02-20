import { db } from "@/db";
import { tasks, subtasks } from "@/db/schema";
import { BoardWrapper } from "@/components/board-wrapper";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { LabelManagerDialog } from "@/components/label-manager-dialog";
import { getLabels, getAllTaskLabels } from "@/app/label-actions";
import { asc } from "drizzle-orm";
import type { SubtasksMap } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [allTasks, allLabels, allTaskLabels] = await Promise.all([
    db.select().from(tasks).orderBy(asc(tasks.position)),
    getLabels(),
    getAllTaskLabels(),
  ]);

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
          <div className="flex items-center gap-2">
            <LabelManagerDialog labels={allLabels} />
            <CreateTaskDialog />
          </div>
        </div>
      </header>
      <main className="flex-1 p-6">
        <BoardWrapper
          tasks={allTasks}
          subtasksMap={subtasksMap}
          labels={allLabels}
          taskLabels={allTaskLabels}
        />
      </main>
    </div>
  );
}

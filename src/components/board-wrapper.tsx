"use client";

import dynamic from "next/dynamic";
import type { Task, SubtasksMap, Label, TaskLabel } from "@/lib/types";

const Board = dynamic(() => import("./board").then((mod) => mod.Board), {
  ssr: false,
});

interface BoardWrapperProps {
  tasks: Task[];
  subtasksMap: SubtasksMap;
  labels: Label[];
  taskLabels: TaskLabel[];
}

export function BoardWrapper({
  tasks,
  subtasksMap,
  labels,
  taskLabels,
}: BoardWrapperProps) {
  return (
    <Board
      tasks={tasks}
      subtasksMap={subtasksMap}
      labels={labels}
      taskLabels={taskLabels}
    />
  );
}

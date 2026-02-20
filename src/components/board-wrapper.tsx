"use client";

import dynamic from "next/dynamic";
import type { Task, SubtasksMap } from "@/lib/types";

const Board = dynamic(() => import("./board").then((mod) => mod.Board), {
  ssr: false,
});

interface BoardWrapperProps {
  tasks: Task[];
  subtasksMap: SubtasksMap;
}

export function BoardWrapper({ tasks, subtasksMap }: BoardWrapperProps) {
  return <Board tasks={tasks} subtasksMap={subtasksMap} />;
}

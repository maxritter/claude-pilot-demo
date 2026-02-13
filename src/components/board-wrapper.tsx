"use client";

import dynamic from "next/dynamic";
import type { Task } from "@/lib/types";

const Board = dynamic(() => import("./board").then((mod) => mod.Board), {
  ssr: false,
});

export function BoardWrapper({ tasks }: { tasks: Task[] }) {
  return <Board tasks={tasks} />;
}

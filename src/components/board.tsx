"use client";

import { useState, useEffect } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Column } from "./column";
import { moveTask } from "@/app/actions";
import type { Task, Status } from "@/lib/types";

interface BoardProps {
  tasks: Task[];
}

type GroupedTasks = {
  todo: Task[];
  "in-progress": Task[];
  done: Task[];
};

export function groupTasksByStatus(taskList: Task[]): GroupedTasks {
  return {
    todo: taskList.filter((task) => task.status === "todo").sort((a, b) => a.position - b.position),
    "in-progress": taskList.filter((task) => task.status === "in-progress").sort((a, b) => a.position - b.position),
    done: taskList.filter((task) => task.status === "done").sort((a, b) => a.position - b.position),
  };
}

export function Board({ tasks: initialTasks }: BoardProps) {
  const [columns, setColumns] = useState<GroupedTasks>(() => groupTasksByStatus(initialTasks));

  useEffect(() => {
    setColumns(groupTasksByStatus(initialTasks));
  }, [initialTasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    const sourceStatus = source.droppableId as Status;
    const destStatus = destination.droppableId as Status;
    const taskId = parseInt(draggableId, 10);

    const snapshot: GroupedTasks = JSON.parse(JSON.stringify(columns));

    setColumns((prevColumns) => {
      const newColumns = { ...prevColumns };
      const sourceColumn = [...newColumns[sourceStatus]];
      const destColumn = sourceStatus === destStatus ? sourceColumn : [...newColumns[destStatus]];

      const [movedTask] = sourceColumn.splice(source.index, 1);

      destColumn.splice(destination.index, 0, { ...movedTask, status: destStatus });

      return {
        ...newColumns,
        [sourceStatus]: sourceColumn,
        [destStatus]: destColumn,
      };
    });

    try {
      await moveTask(taskId, destStatus, destination.index);
    } catch (error) {
      setColumns(snapshot);
      toast.error("Failed to move task. Please try again.");
      console.error("Move task error:", error);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Column title="To Do" status="todo" tasks={columns.todo} />
        <Column title="In Progress" status="in-progress" tasks={columns["in-progress"]} />
        <Column title="Done" status="done" tasks={columns.done} />
      </div>
    </DragDropContext>
  );
}

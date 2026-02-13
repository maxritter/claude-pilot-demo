"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./task-card";
import type { Task, Status } from "@/lib/types";

interface ColumnProps {
  title: string;
  status: Status;
  tasks: Task[];
}

export function Column({ title, status, tasks }: ColumnProps) {
  return (
    <div className="flex min-h-[500px] w-full flex-col rounded-lg border bg-muted/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Badge variant="secondary" className="h-6 w-6 justify-center p-0">
          {tasks.length}
        </Badge>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-3 transition-colors ${
              snapshot.isDraggingOver ? "bg-accent/50 rounded-lg p-2" : ""
            }`}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={snapshot.isDragging ? "opacity-50" : ""}
                  >
                    <TaskCard task={task} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

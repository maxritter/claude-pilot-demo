"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./task-card";
import type { Task, Status, SubtasksMap, Label } from "@/lib/types";

interface ColumnProps {
  title: string;
  status: Status;
  tasks: Task[];
  subtasksMap: SubtasksMap;
  labelsByTask: Record<number, Label[]>;
  allLabels: Label[];
  isDragDisabled?: boolean;
  sortByDueDate: boolean;
  onToggleSort: () => void;
}

export function Column({
  title,
  status,
  tasks,
  subtasksMap,
  labelsByTask,
  allLabels,
  isDragDisabled = false,
  sortByDueDate,
  onToggleSort,
}: ColumnProps) {
  return (
    <div className="flex min-h-[500px] w-full flex-col rounded-lg border bg-muted/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${sortByDueDate ? "text-primary bg-accent" : "text-muted-foreground"}`}
            onClick={onToggleSort}
            title={
              sortByDueDate
                ? "Sorted by due date (click to reset)"
                : "Sort by due date"
            }
            aria-label="Toggle sort by due date"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
          <Badge variant="secondary" className="h-6 w-6 justify-center p-0">
            {tasks.length}
          </Badge>
        </div>
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
              <Draggable
                key={task.id}
                draggableId={String(task.id)}
                index={index}
                isDragDisabled={isDragDisabled}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`${snapshot.isDragging ? "opacity-50" : ""} ${isDragDisabled ? "cursor-default" : ""}`}
                  >
                    <TaskCard
                      task={task}
                      subtasks={subtasksMap[task.id] ?? []}
                      taskLabels={labelsByTask[task.id] ?? []}
                      allLabels={allLabels}
                    />
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

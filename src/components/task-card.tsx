"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditTaskDialog } from "./edit-task-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { LABEL_COLORS } from "@/lib/label-colors";
import type { Task, Subtask, Label, LabelColor } from "@/lib/types";

const priorityColors = {
  low: "bg-green-100 text-green-800 border-green-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  high: "bg-red-100 text-red-800 border-red-300",
};

function SubtaskProgress({ subtasks }: { subtasks: Subtask[] }) {
  if (subtasks.length === 0) return null;

  const completed = subtasks.filter((s) => s.completed).length;
  const total = subtasks.length;
  const pct = total > 0 ? completed / total : 0;

  const fillColor =
    pct === 0 ? "bg-gray-300" : pct === 1 ? "bg-green-500" : "bg-blue-500";

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {completed}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200">
        <div
          className={`h-1.5 rounded-full transition-all ${fillColor}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  subtasks: Subtask[];
  taskLabels: Label[];
  allLabels: Label[];
}

export function TaskCard({
  task,
  subtasks,
  taskLabels,
  allLabels,
}: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Card className="cursor-grab active:cursor-grabbing group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium leading-tight flex-1">
              {task.title}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditOpen(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Badge
                variant="outline"
                className={`${priorityColors[task.priority]} shrink-0`}
              >
                {task.priority}
              </Badge>
            </div>
          </div>
        </CardHeader>
        {(task.description || subtasks.length > 0) && (
          <CardContent className="pb-2">
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
            <SubtaskProgress subtasks={subtasks} />
          </CardContent>
        )}
        {taskLabels.length > 0 && (
          <CardContent className="pt-0 pb-3">
            <div className="flex flex-wrap gap-1">
              {taskLabels.map((label) => {
                const colors = LABEL_COLORS[label.color as LabelColor];
                return (
                  <span
                    key={label.id}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}
                  >
                    {label.name}
                  </span>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
      <EditTaskDialog
        task={task}
        subtasks={subtasks}
        open={editOpen}
        onOpenChange={setEditOpen}
        allLabels={allLabels}
        taskLabels={taskLabels}
      />
      <DeleteTaskDialog
        taskId={task.id}
        taskTitle={task.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}

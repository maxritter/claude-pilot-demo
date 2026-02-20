"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { GripVertical, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  moveSubtask,
} from "@/app/subtask-actions";
import type { Subtask } from "@/lib/types";

interface SubtaskChecklistProps {
  taskId: number;
  subtasks: Subtask[];
  onSubtasksChange: (subtasks: Subtask[]) => void;
}

export function SubtaskChecklist({
  taskId,
  subtasks,
  onSubtasksChange,
}: SubtaskChecklistProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  const handleAddSubtask = async () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;

    const tempId = -Date.now();
    const optimistic: Subtask = {
      id: tempId,
      taskId,
      title: trimmed,
      completed: false,
      position: subtasks.length,
    };
    onSubtasksChange([...subtasks, optimistic]);
    setNewSubtaskTitle("");

    try {
      await createSubtask(taskId, trimmed);
    } catch {
      onSubtasksChange(subtasks.filter((s) => s.id !== tempId));
      toast.error("Failed to add subtask");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const handleToggle = async (subtask: Subtask, checked: boolean) => {
    if (subtask.id < 0) return;
    const snapshot = subtasks;
    onSubtasksChange(
      subtasks.map((s) =>
        s.id === subtask.id ? { ...s, completed: checked } : s,
      ),
    );
    try {
      await toggleSubtask(subtask.id, checked);
    } catch {
      onSubtasksChange(snapshot);
      toast.error("Failed to update subtask");
    }
  };

  const handleDelete = async (subtask: Subtask) => {
    if (subtask.id < 0) return;
    const snapshot = subtasks;
    onSubtasksChange(subtasks.filter((s) => s.id !== subtask.id));
    try {
      await deleteSubtask(subtask.id);
    } catch {
      onSubtasksChange(snapshot);
      toast.error("Failed to delete subtask");
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;

    const reordered = Array.from(subtasks);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    const snapshot = subtasks;
    onSubtasksChange(reordered);

    try {
      await moveSubtask(moved.id, destination.index);
    } catch {
      onSubtasksChange(snapshot);
      toast.error("Failed to reorder subtasks");
    }
  };

  return (
    <div className="grid gap-2">
      <Label>Subtasks</Label>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="subtasks-checklist">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-1"
            >
              {subtasks.map((subtask, index) => (
                <Draggable
                  key={subtask.id}
                  draggableId={String(subtask.id)}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 group ${
                        snapshot.isDragging
                          ? "bg-accent shadow-sm"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <span
                        {...provided.dragHandleProps}
                        className="text-muted-foreground cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={(checked) =>
                          handleToggle(subtask, checked === true)
                        }
                      />
                      <span
                        className={`flex-1 text-sm ${
                          subtask.completed
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {subtask.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(subtask)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <div className="flex gap-2 mt-1">
        <Input
          ref={addInputRef}
          placeholder="Add a subtask..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSubtask}
          disabled={!newSubtaskTitle.trim()}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

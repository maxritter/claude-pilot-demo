"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTask } from "@/app/actions";
import { SubtaskChecklist } from "./subtask-checklist";
import { addLabelToTask, removeLabelFromTask } from "@/app/label-actions";
import { LABEL_COLORS } from "@/lib/label-colors";
import { dateToIso } from "@/lib/date-utils";
import { DatePicker } from "@/components/date-picker";
import type {
  Task,
  Priority,
  Subtask,
  Label as LabelType,
  LabelColor,
} from "@/lib/types";

function parseIsoToLocal(dateStr: string | null): Date | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface EditTaskDialogProps {
  task: Task;
  subtasks: Subtask[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allLabels: LabelType[];
  taskLabels: LabelType[];
}

export function EditTaskDialog({
  task,
  subtasks: subtasksProp,
  open,
  onOpenChange,
  allLabels,
  taskLabels,
}: EditTaskDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    parseIsoToLocal(task.dueDate),
  );
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(subtasksProp);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<number>>(
    () => new Set(taskLabels.map((l) => l.id)),
  );

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setDueDate(parseIsoToLocal(task.dueDate));
      setSelectedLabelIds(new Set(taskLabels.map((l) => l.id)));
    }
  }, [
    open,
    task.title,
    task.description,
    task.priority,
    task.dueDate,
    taskLabels,
  ]);

  useEffect(() => {
    setLocalSubtasks(subtasksProp);
  }, [subtasksProp]);

  const handleLabelToggle = async (labelId: number) => {
    const isSelected = selectedLabelIds.has(labelId);
    setSelectedLabelIds((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(labelId);
      else next.add(labelId);
      return next;
    });
    try {
      if (isSelected) {
        await removeLabelFromTask(task.id, labelId);
      } else {
        await addLabelToTask(task.id, labelId);
      }
    } catch {
      setSelectedLabelIds((prev) => {
        const next = new Set(prev);
        if (isSelected) next.add(labelId);
        else next.delete(labelId);
        return next;
      });
      toast.error("Failed to update label");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsPending(true);

    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate ? dateToIso(dueDate) : null,
      });
      toast.success("Task updated");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update task");
      console.error(error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as Priority)}
                disabled={isPending}
              >
                <SelectTrigger id="edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Due Date (optional)</Label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                disabled={isPending}
              />
            </div>
            <SubtaskChecklist
              taskId={task.id}
              subtasks={localSubtasks}
              onSubtasksChange={setLocalSubtasks}
            />
            {allLabels.length > 0 && (
              <div className="grid gap-2">
                <Label>Labels</Label>
                <div className="flex flex-wrap gap-2">
                  {allLabels.map((label) => {
                    const colors = LABEL_COLORS[label.color as LabelColor];
                    const isSelected = selectedLabelIds.has(label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => handleLabelToggle(label.id)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${colors.bg} ${colors.text} ${
                          isSelected
                            ? `ring-2 ring-offset-1 ${colors.ring}`
                            : "opacity-50 hover:opacity-80"
                        }`}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

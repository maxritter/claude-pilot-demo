"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tag, Pencil, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLabel, updateLabel, deleteLabel } from "@/app/label-actions";
import { LABEL_COLORS, LABEL_SWATCH_BG } from "@/lib/label-colors";
import { LABEL_COLOR_VALUES } from "@/db/schema";
import type { Label as LabelType, LabelColor } from "@/lib/types";

interface LabelManagerDialogProps {
  labels: LabelType[];
}

export function LabelManagerDialog({ labels }: LabelManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<LabelColor>("blue");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<LabelColor>("blue");
  const [isPending, setIsPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LabelType | null>(null);

  function startEdit(label: LabelType) {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color as LabelColor);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleUpdate() {
    if (!editName.trim() || editingId === null) return;
    setIsPending(true);
    try {
      await updateLabel(editingId, { name: editName.trim(), color: editColor });
      toast.success("Label updated");
      setEditingId(null);
    } catch {
      toast.error("Failed to update label");
    } finally {
      setIsPending(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error("Label name is required");
      return;
    }
    setIsPending(true);
    try {
      await createLabel({ name: newName.trim(), color: newColor });
      toast.success("Label created");
      setNewName("");
      setNewColor("blue");
    } catch {
      toast.error("Failed to create label");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete(label: LabelType) {
    setIsPending(true);
    try {
      await deleteLabel(label.id);
      toast.success("Label deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete label");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Tag className="mr-2 h-4 w-4" />
            Labels
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Labels</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            {labels.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No labels yet. Create one below.
              </p>
            )}

            {labels.map((label) => {
              const colors = LABEL_COLORS[label.color as LabelColor];
              if (editingId === label.id) {
                return (
                  <div
                    key={label.id}
                    className="flex flex-col gap-2 rounded-lg border p-3"
                  >
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Label name"
                      disabled={isPending}
                    />
                    <ColorPicker
                      value={editColor}
                      onChange={setEditColor}
                      disabled={isPending}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUpdate}
                        disabled={isPending}
                      >
                        {isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={label.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}
                  >
                    {label.name}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEdit(label)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(label)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="border-t pt-3 flex flex-col gap-2">
              <Label className="text-sm font-medium">New Label</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Label name"
                disabled={isPending}
              />
              <ColorPicker
                value={newColor}
                onChange={setNewColor}
                disabled={isPending}
              />
              <Button
                onClick={handleCreate}
                disabled={isPending}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                {isPending ? "Creating..." : "Create Label"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Label</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteTarget?.name}&quot;? It will be removed from
              all tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) handleDelete(deleteTarget);
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: LabelColor;
  onChange: (c: LabelColor) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {LABEL_COLOR_VALUES.map((color) => (
        <button
          key={color}
          type="button"
          disabled={disabled}
          onClick={() => onChange(color)}
          className={`h-6 w-6 rounded-full ${LABEL_SWATCH_BG[color]} transition-transform hover:scale-110 ${
            value === color
              ? "ring-2 ring-offset-2 ring-foreground scale-110"
              : ""
          }`}
          aria-label={color}
        />
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Column } from "./column";
import { LabelFilter } from "./label-filter";
import { moveTask } from "@/app/actions";
import type { Task, Status, SubtasksMap, Label, TaskLabel } from "@/lib/types";

interface BoardProps {
  tasks: Task[];
  subtasksMap: SubtasksMap;
  labels: Label[];
  taskLabels: TaskLabel[];
}

type GroupedTasks = {
  todo: Task[];
  "in-progress": Task[];
  done: Task[];
};

export function groupTasksByStatus(taskList: Task[]): GroupedTasks {
  return {
    todo: taskList
      .filter((task) => task.status === "todo")
      .sort((a, b) => a.position - b.position),
    "in-progress": taskList
      .filter((task) => task.status === "in-progress")
      .sort((a, b) => a.position - b.position),
    done: taskList
      .filter((task) => task.status === "done")
      .sort((a, b) => a.position - b.position),
  };
}

export function Board({
  tasks: initialTasks,
  subtasksMap,
  labels,
  taskLabels,
}: BoardProps) {
  const [columns, setColumns] = useState<GroupedTasks>(() =>
    groupTasksByStatus(initialTasks),
  );
  const [activeFilterIds, setActiveFilterIds] = useState<Set<number>>(
    new Set(),
  );

  const labelsByTask = useMemo(() => {
    const map: Record<number, Label[]> = {};
    const labelMap = new Map(labels.map((l) => [l.id, l]));
    for (const tl of taskLabels) {
      const label = labelMap.get(tl.labelId);
      if (label) {
        (map[tl.taskId] ??= []).push(label);
      }
    }
    return map;
  }, [labels, taskLabels]);

  useEffect(() => {
    setColumns(groupTasksByStatus(initialTasks));
  }, [initialTasks]);

  useEffect(() => {
    const validIds = new Set(labels.map((l) => l.id));
    setActiveFilterIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [labels]);

  const toggleFilter = useCallback((labelId: number) => {
    setActiveFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) next.delete(labelId);
      else next.add(labelId);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setActiveFilterIds(new Set()), []);

  const filterTasks = (tasks: Task[]) => {
    if (activeFilterIds.size === 0) return tasks;
    return tasks.filter((task) =>
      (labelsByTask[task.id] ?? []).some((l) => activeFilterIds.has(l.id)),
    );
  };

  const isFiltering = activeFilterIds.size > 0;

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (
      !destination ||
      (source.droppableId === destination.droppableId &&
        source.index === destination.index)
    ) {
      return;
    }

    const sourceStatus = source.droppableId as Status;
    const destStatus = destination.droppableId as Status;
    const taskId = parseInt(draggableId, 10);

    const snapshot: GroupedTasks = JSON.parse(JSON.stringify(columns));

    setColumns((prevColumns) => {
      const newColumns = { ...prevColumns };
      const sourceColumn = [...newColumns[sourceStatus]];
      const destColumn =
        sourceStatus === destStatus
          ? sourceColumn
          : [...newColumns[destStatus]];

      const [movedTask] = sourceColumn.splice(source.index, 1);

      destColumn.splice(destination.index, 0, {
        ...movedTask,
        status: destStatus,
      });

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
    <div>
      <LabelFilter
        labels={labels}
        activeIds={activeFilterIds}
        onToggle={toggleFilter}
        onClear={clearFilters}
      />
      {isFiltering && (
        <p className="text-xs text-muted-foreground mb-2">
          Clear filters to reorder tasks
        </p>
      )}
      <DragDropContext onDragEnd={isFiltering ? () => {} : handleDragEnd}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Column
            title="To Do"
            status="todo"
            tasks={filterTasks(columns.todo)}
            subtasksMap={subtasksMap}
            labelsByTask={labelsByTask}
            allLabels={labels}
            isDragDisabled={isFiltering}
          />
          <Column
            title="In Progress"
            status="in-progress"
            tasks={filterTasks(columns["in-progress"])}
            subtasksMap={subtasksMap}
            labelsByTask={labelsByTask}
            allLabels={labels}
            isDragDisabled={isFiltering}
          />
          <Column
            title="Done"
            status="done"
            tasks={filterTasks(columns.done)}
            subtasksMap={subtasksMap}
            labelsByTask={labelsByTask}
            allLabels={labels}
            isDragDisabled={isFiltering}
          />
        </div>
      </DragDropContext>
    </div>
  );
}

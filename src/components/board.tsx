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

type SortState = Record<Status, boolean>;

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

function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function sortColumnByDueDate(tasks: Task[]): Task[] {
  const withDate = tasks
    .filter((t) => t.dueDate)
    .sort((a, b) => {
      return (
        parseDateLocal(a.dueDate!).getTime() -
        parseDateLocal(b.dueDate!).getTime()
      );
    });
  const withoutDate = tasks.filter((t) => !t.dueDate);
  return [...withDate, ...withoutDate];
}

function applySort(grouped: GroupedTasks, sort: SortState): GroupedTasks {
  return {
    todo: sort.todo ? sortColumnByDueDate(grouped.todo) : grouped.todo,
    "in-progress": sort["in-progress"]
      ? sortColumnByDueDate(grouped["in-progress"])
      : grouped["in-progress"],
    done: sort.done ? sortColumnByDueDate(grouped.done) : grouped.done,
  };
}

const defaultSort: SortState = {
  todo: false,
  "in-progress": false,
  done: false,
};

export function Board({
  tasks: initialTasks,
  subtasksMap,
  labels,
  taskLabels,
}: BoardProps) {
  const [sortByDueDate, setSortByDueDate] = useState<SortState>(defaultSort);
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
    setColumns(applySort(groupTasksByStatus(initialTasks), sortByDueDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTasks]);

  useEffect(() => {
    const validIds = new Set(labels.map((l) => l.id));
    setActiveFilterIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [labels]);

  const handleToggleSort = (status: Status) => {
    setSortByDueDate((prev) => {
      const next = { ...prev, [status]: !prev[status] };
      setColumns(applySort(groupTasksByStatus(initialTasks), next));
      return next;
    });
  };

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

    if (sortByDueDate[sourceStatus] || sortByDueDate[destStatus]) {
      toast.info("Disable due date sort to reorder tasks.");
      return;
    }

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
            isDragDisabled={isFiltering || sortByDueDate.todo}
            sortByDueDate={sortByDueDate.todo}
            onToggleSort={() => handleToggleSort("todo")}
          />
          <Column
            title="In Progress"
            status="in-progress"
            tasks={filterTasks(columns["in-progress"])}
            subtasksMap={subtasksMap}
            labelsByTask={labelsByTask}
            allLabels={labels}
            isDragDisabled={isFiltering || sortByDueDate["in-progress"]}
            sortByDueDate={sortByDueDate["in-progress"]}
            onToggleSort={() => handleToggleSort("in-progress")}
          />
          <Column
            title="Done"
            status="done"
            tasks={filterTasks(columns.done)}
            subtasksMap={subtasksMap}
            labelsByTask={labelsByTask}
            allLabels={labels}
            isDragDisabled={isFiltering || sortByDueDate.done}
            sortByDueDate={sortByDueDate.done}
            onToggleSort={() => handleToggleSort("done")}
          />
        </div>
      </DragDropContext>
    </div>
  );
}

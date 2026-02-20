"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LABEL_COLORS } from "@/lib/label-colors";
import type { Label, LabelColor } from "@/lib/types";

interface LabelFilterProps {
  labels: Label[];
  activeIds: Set<number>;
  onToggle: (id: number) => void;
  onClear: () => void;
}

export function LabelFilter({
  labels,
  activeIds,
  onToggle,
  onClear,
}: LabelFilterProps) {
  if (labels.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <span className="text-sm text-muted-foreground shrink-0">Filter:</span>
      {labels.map((label) => {
        const colors = LABEL_COLORS[label.color as LabelColor];
        const isActive = activeIds.has(label.id);
        return (
          <button
            key={label.id}
            type="button"
            onClick={() => onToggle(label.id)}
            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${colors.bg} ${colors.text} ${
              isActive
                ? `ring-2 ring-offset-1 ${colors.ring}`
                : "opacity-50 hover:opacity-80"
            }`}
          >
            {label.name}
          </button>
        );
      })}
      {activeIds.size > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={onClear}
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

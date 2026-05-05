"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "./KanbanBoard";
import { GripVertical, Trash2 } from "lucide-react";

interface Props {
  task: Task;
  isOverlay?: boolean;
  onDelete?: () => void;
  onEditTask?: (task: Task) => void;
}

export function KanbanCard({ task, isOverlay, onDelete, onEditTask }: Props) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex min-h-[100px] items-center justify-center rounded-xl border-2 border-indigo-400 border-dashed bg-indigo-50/50 opacity-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col rounded-xl border border-(--line) bg-white p-4 shadow-sm transition-all hover:shadow-md ${
        isOverlay ? "rotate-2 scale-105 shadow-xl cursor-grabbing" : "cursor-grab"
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-slate-400">
            <GripVertical size={16} />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 leading-tight">{task.title}</h4>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Edit Button */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEditTask?.(task);
            }}
            className="invisible flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-blue-50 hover:text-blue-500 group-hover:visible"
            title="Edit Task"
            
            >
              ✏️
            </button>

           {/* Delete Button */}
            {onDelete && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="invisible flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500 group-hover:visible"
                title="Delete Task"

                >
                  <Trash2 size={14} />
                </button>
            )}
          </div>
      </div>
      
      {task.description && (
        <p className="mt-2 text-xs text-slate-500 pl-6 line-clamp-2">{task.description}</p>
      )}
    </div>
  );
}

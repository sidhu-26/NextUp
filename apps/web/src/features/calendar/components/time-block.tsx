"use client";

import React, { useState, useRef } from "react";
import type { Task } from "@/features/tasks/types";
import { formatTimeRangeZoned } from "../utils/date-utils";
import { CheckIcon } from "@/components/ui/icons";

interface TimeBlockProps {
  task: Task;
  timeZone: string;
  is24Hour?: boolean;
  top: number;
  height: number;
  onSelect: (task: Task) => void;
  onCompleteToggle: (task: Task, e: React.MouseEvent) => void;
  onUnschedule: (task: Task, e: React.MouseEvent) => void;
  onDragStart: (task: Task, e: React.DragEvent) => void;
  onResizeEnd: (task: Task, newMinutesDuration: number) => void;
}

export function TimeBlock({
  task,
  timeZone,
  is24Hour = false,
  top,
  height,
  onSelect,
  onCompleteToggle,
  onUnschedule,
  onDragStart,
  onResizeEnd,
}: TimeBlockProps) {
  const isCompleted = task.status === "completed";
  const projectColor = task.project?.color || "#6366F1";
  const [resizing, setResizing] = useState(false);
  const initialResizeY = useRef<number>(0);
  const initialHeight = useRef<number>(height);

  const priorityBadgeColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-900",
    high: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900",
    medium: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900",
    low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setResizing(true);
    initialResizeY.current = e.clientY;
    initialHeight.current = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = () => {
    if (!resizing) return;
    // Handled on pointer up
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (!resizing) return;
    setResizing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const dy = e.clientY - initialResizeY.current;
    const deltaMin = Math.round(dy / 15) * 15;
    const newDuration = Math.max(15, Math.round(initialHeight.current) + deltaMin);
    if (newDuration !== Math.round(initialHeight.current)) {
      onResizeEnd(task, newDuration);
    }
  };

  const timeFormatted =
    task.scheduled_start_at && task.scheduled_end_at
      ? formatTimeRangeZoned(task.scheduled_start_at, task.scheduled_end_at, timeZone, is24Hour)
      : "";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(task, e)}
      onClick={() => onSelect(task)}
      style={{
        top: `${top}px`,
        height: `${Math.max(26, height)}px`,
        borderLeftColor: projectColor,
      }}
      className={`absolute left-1 right-1 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 border-l-4 shadow-xs text-xs overflow-hidden cursor-pointer select-none transition-all group z-10 hover:z-20 hover:shadow-md ${
        isCompleted
          ? "bg-zinc-100/90 dark:bg-zinc-900/80 text-zinc-400 dark:text-zinc-500 line-through opacity-75"
          : "bg-white/95 dark:bg-zinc-800/95 text-zinc-900 dark:text-zinc-100"
      }`}
    >
      <div className="p-1.5 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-1 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={(e) => onCompleteToggle(task, e)}
              className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition cursor-pointer ${
                isCompleted
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "border-zinc-300 dark:border-zinc-600 hover:border-violet-600"
              }`}
              title={isCompleted ? "Mark incomplete" : "Mark completed"}
            >
              {isCompleted && <CheckIcon className="w-2.5 h-2.5 stroke-[3]" />}
            </button>
            <span
              className={`font-semibold truncate ${
                isCompleted ? "line-through text-zinc-400 dark:text-zinc-500" : ""
              }`}
            >
              {task.title}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {task.priority && task.priority !== "medium" && (
              <span
                className={`text-[9px] font-bold px-1 py-0.5 rounded border uppercase ${
                  priorityBadgeColors[task.priority] || ""
                }`}
              >
                {task.priority[0]}
              </span>
            )}
            <button
              onClick={(e) => onUnschedule(task, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
              title="Remove from calendar (move to backlog)"
            >
              ✕
            </button>
          </div>
        </div>

        {height >= 38 && (
          <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 mt-auto truncate pt-1">
            <span className="truncate">{timeFormatted}</span>
            {task.project && (
              <span
                className="truncate font-medium px-1 py-0.2 rounded"
                style={{
                  backgroundColor: `${projectColor}15`,
                  color: projectColor,
                }}
              >
                {task.project.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Resize Bottom Handle */}
      <div
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-violet-400/40 active:bg-violet-600/50 transition-colors z-30"
        title="Drag to resize duration"
      />
    </div>
  );
}

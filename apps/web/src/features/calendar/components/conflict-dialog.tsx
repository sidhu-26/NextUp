"use client";

import React from "react";
import type { Task } from "@/features/tasks/types";
import { XMarkIcon } from "@/components/ui/icons";
import { formatTimeRangeZoned } from "../utils/date-utils";

interface ConflictDialogProps {
  isOpen: boolean;
  targetTask: Task | null;
  proposedStart: string | null;
  proposedEnd: string | null;
  conflictingTasks: Task[];
  timeZone: string;
  is24Hour?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConflictDialog({
  isOpen,
  targetTask,
  proposedStart,
  proposedEnd,
  conflictingTasks,
  timeZone,
  is24Hour = false,
  onConfirm,
  onCancel,
}: ConflictDialogProps) {
  if (!isOpen || !targetTask || !proposedStart || !proposedEnd) return null;

  const proposedFormatted = formatTimeRangeZoned(
    proposedStart,
    proposedEnd,
    timeZone,
    is24Hour
  );

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
              ⚠️
            </span>
            <h2
              id="conflict-dialog-title"
              className="text-base font-bold text-zinc-900 dark:text-zinc-100"
            >
              Scheduling Conflict Detected
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
          Scheduling <strong>&ldquo;{targetTask.title}&rdquo;</strong> for{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {proposedFormatted}
          </span>{" "}
          overlaps with {conflictingTasks.length}{" "}
          {conflictingTasks.length === 1 ? "existing task" : "existing tasks"}:
        </p>

        <div className="mt-3 max-h-40 overflow-y-auto space-y-2 p-2 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
          {conflictingTasks.map((t) => (
            <div
              key={t.id}
              className="p-2 rounded-lg bg-white dark:bg-zinc-800 text-xs flex items-center justify-between border border-zinc-200 dark:border-zinc-700"
            >
              <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                {t.title}
              </div>
              <div className="text-zinc-500 text-[11px] shrink-0 ml-2">
                {t.scheduled_start_at && t.scheduled_end_at
                  ? formatTimeRangeZoned(
                      t.scheduled_start_at,
                      t.scheduled_end_at,
                      timeZone,
                      is24Hour
                    )
                  : ""}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Conflicts in NextUP are allowed as warnings. You may confirm to schedule anyway or cancel to select another slot.
        </p>

        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            Schedule Anyway (Overlap)
          </button>
        </div>
      </div>
    </div>
  );
}

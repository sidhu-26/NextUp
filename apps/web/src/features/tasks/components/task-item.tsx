"use client";

import React, { useState } from "react";
import type { Task, TaskPriority } from "../types";
import { useTasks } from "../hooks/use-tasks";
import { tasksService } from "../services/tasks-service";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onAddSubtask: (parentTask: Task) => void;
  isSubtask?: boolean;
}

const PRIORITY_BADGES: Record<TaskPriority, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900" },
  high: { label: "High", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900" },
  medium: { label: "Medium", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900" },
  low: { label: "Low", className: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700" },
};

export function TaskItem({
  task,
  onEdit,
  onAddSubtask,
  isSubtask = false,
}: TaskItemProps) {
  const { completeTask, reopenTask, deleteTask } = useTasks();
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isCompleted = task.status === "completed";

  const handleToggleComplete = async () => {
    setIsUpdating(true);
    try {
      if (isCompleted) {
        await reopenTask(task.id);
      } else {
        await completeTask(task.id);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    const hasSubtasks = (task.subtasks_count ?? 0) > 0;
    const confirmMsg = hasSubtasks
      ? `Deleting "${task.title}" will also permanently delete all its subtasks. Continue?`
      : `Are you sure you want to delete "${task.title}"?`;

    if (window.confirm(confirmMsg)) {
      await deleteTask(task.id);
    }
  };

  const handleToggleSubtasks = async () => {
    if (!isSubtasksExpanded && subtasks.length === 0) {
      setIsLoadingSubtasks(true);
      try {
        const res = await tasksService.listTasks({
          parent_task: task.id,
          page_size: 50,
        });
        setSubtasks(res.results);
      } finally {
        setIsLoadingSubtasks(false);
      }
    }
    setIsSubtasksExpanded((v) => !v);
  };

  const formatDueDate = (iso: string | null) => {
    if (!iso) return null;
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`group transition-colors rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 ${isSubtask ? "ml-6 my-1 bg-zinc-50/50 dark:bg-zinc-900/50" : "my-2"} shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700`}>
      <div className="flex items-center gap-3 p-3.5">
        {/* Subtask expand chevron */}
        {!isSubtask && (task.subtasks_count ?? 0) > 0 ? (
          <button
            onClick={handleToggleSubtasks}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
            aria-label="Toggle subtasks"
          >
            {isSubtasksExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
        ) : (
          !isSubtask && <div className="w-6" />
        )}

        {/* Checkbox toggle */}
        <button
          onClick={handleToggleComplete}
          disabled={isUpdating}
          className={`w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer ${
            isCompleted
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "border-zinc-300 dark:border-zinc-600 hover:border-violet-600 bg-white dark:bg-zinc-800"
          }`}
          aria-label={isCompleted ? "Reopen task" : "Mark task as complete"}
        >
          {isCompleted && (
            <svg className="w-3.5 h-3.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>

        {/* Task Title & Project details */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium truncate ${
                isCompleted
                  ? "line-through text-zinc-400 dark:text-zinc-500"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {task.title}
            </span>

            {/* Project tag if assigned */}
            {task.project && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: `${task.project.color || "#8B5CF6"}15`,
                  borderColor: `${task.project.color || "#8B5CF6"}30`,
                  color: task.project.color || "#8B5CF6",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: task.project.color || "#8B5CF6" }}
                />
                {task.project.name}
              </span>
            )}
          </div>

          {/* Subtext info: Due date, est minutes */}
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 dark:text-zinc-500 flex-wrap">
            {task.due_at && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" />
                {formatDueDate(task.due_at)}
              </span>
            )}
            {task.estimated_minutes && (
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                {task.estimated_minutes}m
              </span>
            )}
            {!isSubtask && (task.subtasks_count ?? 0) > 0 && (
              <span className="text-violet-600 dark:text-violet-400 font-medium">
                {task.subtasks_count} subtask{task.subtasks_count > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Priority Badge */}
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
            PRIORITY_BADGES[task.priority].className
          }`}
        >
          {PRIORITY_BADGES[task.priority].label}
        </span>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
          {!isSubtask && (
            <button
              onClick={() => onAddSubtask(task)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition cursor-pointer"
              title="Add Subtask"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
            title="Delete Task"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Subtasks Container */}
      {!isSubtask && isSubtasksExpanded && (
        <div className="px-4 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-950/40">
          {isLoadingSubtasks ? (
            <p className="text-xs text-zinc-400 py-2">Loading subtasks...</p>
          ) : subtasks.length === 0 ? (
            <p className="text-xs text-zinc-400 italic py-2">No subtasks yet.</p>
          ) : (
            <div className="space-y-1">
              {subtasks.map((st) => (
                <TaskItem
                  key={st.id}
                  task={st}
                  onEdit={onEdit}
                  onAddSubtask={onAddSubtask}
                  isSubtask={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import type { Task, TaskPriority } from "@/features/tasks/types";
import { tasksService } from "@/features/tasks/services/tasks-service";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { SearchIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

interface UnscheduledPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDragStartTask: (task: Task, e: React.DragEvent) => void;
  onQuickSchedule: (task: Task) => void;
  onSelectTask: (task: Task) => void;
  refreshTrigger?: number;
}

export function UnscheduledPanel({
  isOpen,
  onClose,
  onDragStartTask,
  onQuickSchedule,
  onSelectTask,
  refreshTrigger = 0,
}: UnscheduledPanelProps) {
  const { activeProjects } = useProjects();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const pageSize = 15;

  useEffect(() => {
    let ignore = false;
    async function execute() {
      if (!isOpen) return;
      setIsLoading(true);
      try {
        const res = await tasksService.listTasks({
          is_scheduled: false,
          status: "todo",
          search: search.trim() || undefined,
          priority: (priorityFilter as TaskPriority) || undefined,
          project: projectFilter || undefined,
          page,
          page_size: pageSize,
        });
        if (!ignore) {
          setTasks(res.results);
          setTotalCount(res.count);
        }
      } catch {
        // Ignored
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    void execute();
    return () => {
      ignore = true;
    };
  }, [isOpen, page, search, priorityFilter, projectFilter, refreshTrigger]);

  if (!isOpen) return null;

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-900",
    high: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-900",
    medium: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-900",
    low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
  };

  return (
    <aside className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-full shrink-0 shadow-lg md:shadow-none z-30">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Unscheduled Backlog
          </h2>
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            {totalCount}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 space-y-2.5">
        <div className="relative">
          <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search backlog..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer truncate"
          >
            <option value="">All Projects</option>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List (Draggable items) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-xs text-zinc-400">
            Loading backlog...
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-zinc-400 px-4">
            <p className="font-semibold text-zinc-500">No unscheduled tasks found</p>
            <p className="mt-1">All tasks have been scheduled or filtered out.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => onDragStartTask(task, e)}
              onClick={() => onSelectTask(task)}
              style={{
                borderLeftColor: task.project?.color || "#94A3B8",
              }}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 border-l-4 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-800/90 shadow-2xs hover:shadow-xs transition cursor-grab active:cursor-grabbing text-xs group"
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {task.title}
                </span>
                <span
                  className={`text-[9px] font-bold px-1 py-0.5 rounded border uppercase shrink-0 ${
                    priorityColors[task.priority] || ""
                  }`}
                >
                  {task.priority}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2">
                <span>
                  {task.estimated_minutes ? `${task.estimated_minutes}m est.` : "30m"}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickSchedule(task);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-violet-600 dark:text-violet-400 hover:underline font-semibold transition"
                  title="Schedule for next available slot"
                >
                  + Schedule
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition cursor-pointer"
            title="Previous page"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition cursor-pointer"
            title="Next page"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

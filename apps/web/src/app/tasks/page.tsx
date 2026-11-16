"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useTasks } from "@/features/tasks/hooks/use-tasks";
import { TaskItem } from "@/features/tasks/components/task-item";
import { TaskModal } from "@/features/tasks/components/task-modal";
import type { Task, TaskPriority, TaskStatus } from "@/features/tasks/types";
import { PlusIcon } from "@/components/ui/icons";

export default function TasksPage() {
  const [search, setSearch] = useState("");

  return (
    <AppShell searchQuery={search} onSearchChange={setSearch}>
      <TasksContent search={search} />
    </AppShell>
  );
}

function TasksContent({ search }: { search: string }) {
  const { tasks, totalCount, isLoading, error, fetchTasks } = useTasks();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [ordering, setOrdering] = useState<string>("-created_at");
  const [page, setPage] = useState<number>(1);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<Task | null>(null);

  useEffect(() => {
    void fetchTasks({
      search: search || undefined,
      status: statusFilter ? (statusFilter as TaskStatus) : undefined,
      priority: priorityFilter ? (priorityFilter as TaskPriority) : undefined,
      ordering,
      page,
      page_size: 20,
      include_subtasks: false, // only top-level in main view
    });
  }, [fetchTasks, search, statusFilter, priorityFilter, ordering, page]);

  const handleEdit = (task: Task) => {
    setTaskToEdit(task);
    setParentTaskForSubtask(null);
    setIsTaskModalOpen(true);
  };

  const handleAddSubtask = (parentTask: Task) => {
    setTaskToEdit(null);
    setParentTaskForSubtask(parentTask);
    setIsTaskModalOpen(true);
  };

  return (
    <>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-50">
            Inbox / All Tasks
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {totalCount} total item{totalCount === 1 ? "" : "s"}
          </p>
        </div>

        <button
          onClick={() => {
            setTaskToEdit(null);
            setParentTaskForSubtask(null);
            setIsTaskModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xs transition self-start sm:self-auto cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter and Sorting Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-600"
        >
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-600"
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Sort Order */}
        <select
          value={ordering}
          onChange={(e) => {
            setOrdering(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-600"
        >
          <option value="-created_at">Newest First</option>
          <option value="created_at">Oldest First</option>
          <option value="due_at">Due Soonest</option>
          <option value="-priority">Highest Priority</option>
          <option value="title">Alphabetical</option>
        </select>
      </div>

      {/* Task List */}
      <div>
        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center text-sm text-zinc-400">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              No tasks found
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {search || statusFilter || priorityFilter
                ? "Try clearing filters to see more tasks."
                : "Create your first task to start organizing your work."}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onAddSubtask={handleAddSubtask}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalCount > 20 && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-zinc-500">
            Page {page} of {Math.ceil(totalCount / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(totalCount / 20)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          void fetchTasks({
            search: search || undefined,
            status: statusFilter ? (statusFilter as TaskStatus) : undefined,
            priority: priorityFilter ? (priorityFilter as TaskPriority) : undefined,
            ordering,
            page,
            page_size: 20,
            include_subtasks: false,
          });
        }}
        taskToEdit={taskToEdit}
        defaultParentTaskId={parentTaskForSubtask?.id}
      />
    </>
  );
}

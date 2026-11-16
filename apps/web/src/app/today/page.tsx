"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { tasksService } from "@/features/tasks/services/tasks-service";
import { TaskItem } from "@/features/tasks/components/task-item";
import { TaskModal } from "@/features/tasks/components/task-modal";
import type { Task } from "@/features/tasks/types";
import { PlusIcon } from "@/components/ui/icons";

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<Task | null>(null);

  const loadTodayTasks = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

      const res = await tasksService.listTasks({
        due_after: startOfToday,
        due_before: endOfToday,
        page_size: 100,
      });
      setTasks(res.results);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load today's tasks");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

        const res = await tasksService.listTasks({
          due_after: startOfToday,
          due_before: endOfToday,
          page_size: 100,
        });
        if (isMounted) {
          setTasks(res.results);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Failed to load today's tasks");
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

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
    <AppShell>
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-50">
            Today
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Focus on what matters most before the day ends.
          </p>
        </div>

        <button
          onClick={() => {
            setTaskToEdit(null);
            setParentTaskForSubtask(null);
            setIsTaskModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xs transition cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      <div className="mt-4">
        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center text-sm text-zinc-400">Loading today&apos;s tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              Clear plate for today!
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              You have no pending deadlines due today. Great job staying ahead of schedule.
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

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          void loadTodayTasks();
        }}
        taskToEdit={taskToEdit}
        defaultParentTaskId={parentTaskForSubtask?.id}
      />
    </AppShell>
  );
}

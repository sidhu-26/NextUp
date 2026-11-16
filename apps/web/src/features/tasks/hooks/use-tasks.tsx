"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { tasksService } from "@/features/tasks/services/tasks-service";
import type {
  CreateTaskPayload,
  PaginatedTasksResponse,
  Task,
  TaskFilterParams,
  UpdateTaskPayload,
} from "@/features/tasks/types";

interface TasksContextType {
  tasks: Task[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  activeFilter: TaskFilterParams;
  fetchTasks: (params?: TaskFilterParams) => Promise<void>;
  createTask: (payload: CreateTaskPayload) => Promise<Task>;
  updateTask: (id: string, payload: UpdateTaskPayload) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<Task>;
  reopenTask: (id: string) => Promise<Task>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TaskFilterParams>({});

  const fetchTasks = useCallback(async (params: TaskFilterParams = {}) => {
    setIsLoading(true);
    setActiveFilter(params);
    try {
      const response: PaginatedTasksResponse = await tasksService.listTasks(params);
      setTasks(response.results);
      setTotalCount(response.count);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to fetch tasks.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTask = async (payload: CreateTaskPayload): Promise<Task> => {
    const newTask = await tasksService.createTask(payload);
    // If it's a top-level task and matches current view, prepend
    setTasks((prev) => [newTask, ...prev]);
    setTotalCount((c) => c + 1);
    return newTask;
  };

  const updateTask = async (id: string, payload: UpdateTaskPayload): Promise<Task> => {
    const updated = await tasksService.updateTask(id, payload);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };

  const deleteTask = async (id: string): Promise<void> => {
    await tasksService.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id && t.parent_task?.id !== id));
    setTotalCount((c) => Math.max(0, c - 1));
  };

  const completeTask = async (id: string): Promise<Task> => {
    const completed = await tasksService.completeTask(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? completed : t)));
    return completed;
  };

  const reopenTask = async (id: string): Promise<Task> => {
    const reopened = await tasksService.reopenTask(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? reopened : t)));
    return reopened;
  };

  return (
    <TasksContext.Provider
      value={{
        tasks,
        totalCount,
        isLoading,
        error,
        activeFilter,
        fetchTasks,
        createTask,
        updateTask,
        deleteTask,
        completeTask,
        reopenTask,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks(): TasksContextType {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error("useTasks must be used within a TasksProvider");
  }
  return context;
}

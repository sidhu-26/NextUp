import { apiClient } from "@/lib/api-client";
import type {
  CreateTaskPayload,
  PaginatedTasksResponse,
  Task,
  TaskFilterParams,
  UpdateTaskPayload,
} from "../types";

export const tasksService = {
  /**
   * List paginated tasks with filtering, searching, and sorting.
   */
  async listTasks(params: TaskFilterParams = {}): Promise<PaginatedTasksResponse> {
    const searchParams = new URLSearchParams();

    if (params.status) searchParams.set("status", params.status);
    if (params.priority) searchParams.set("priority", params.priority);
    if (params.project) searchParams.set("project", params.project);
    if (params.parent_task) searchParams.set("parent_task", params.parent_task);
    if (typeof params.include_subtasks === "boolean") {
      searchParams.set("include_subtasks", params.include_subtasks.toString());
    }
    if (params.due_after) searchParams.set("due_after", params.due_after);
    if (params.due_before) searchParams.set("due_before", params.due_before);
    if (params.scheduled_from) searchParams.set("scheduled_from", params.scheduled_from);
    if (params.scheduled_to) searchParams.set("scheduled_to", params.scheduled_to);
    if (typeof params.is_scheduled === "boolean") {
      searchParams.set("is_scheduled", params.is_scheduled.toString());
    }
    if (params.search) searchParams.set("search", params.search);
    if (params.ordering) searchParams.set("ordering", params.ordering);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.page_size) searchParams.set("page_size", params.page_size.toString());

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/tasks/${queryString ? `?${queryString}` : ""}`;

    return apiClient<PaginatedTasksResponse>(endpoint, {
      method: "GET",
    });
  },

  /**
   * Retrieve task detail by UUID.
   */
  async getTask(id: string): Promise<Task> {
    return apiClient<Task>(`/api/v1/tasks/${id}/`, {
      method: "GET",
    });
  },

  /**
   * Create a new task or subtask.
   */
  async createTask(payload: CreateTaskPayload): Promise<Task> {
    return apiClient<Task>("/api/v1/tasks/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update an existing task.
   */
  async updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
    return apiClient<Task>(`/api/v1/tasks/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Complete a task (marks completed, sets completed_at).
   */
  async completeTask(id: string): Promise<Task> {
    return apiClient<Task>(`/api/v1/tasks/${id}/complete/`, {
      method: "POST",
    });
  },

  /**
   * Reopen a task (marks todo, clears completed_at).
   */
  async reopenTask(id: string): Promise<Task> {
    return apiClient<Task>(`/api/v1/tasks/${id}/reopen/`, {
      method: "POST",
    });
  },

  /**
   * Delete a task. Subtasks are cascade deleted by backend.
   */
  async deleteTask(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/tasks/${id}/`, {
      method: "DELETE",
    });
  },

  /**
   * Check for scheduling conflicts in a given interval.
   */
  async checkConflicts(
    startAt: string,
    endAt: string,
    excludeTaskId?: string
  ): Promise<{ has_conflicts: boolean; conflicts_count: number; conflicts: Task[] }> {
    const searchParams = new URLSearchParams({
      start_at: startAt,
      end_at: endAt,
    });
    if (excludeTaskId) {
      searchParams.set("exclude_task_id", excludeTaskId);
    }
    return apiClient<{ has_conflicts: boolean; conflicts_count: number; conflicts: Task[] }>(
      `/api/v1/tasks/conflicts/?${searchParams.toString()}`,
      { method: "GET" }
    );
  },
};

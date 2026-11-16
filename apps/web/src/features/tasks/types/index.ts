/**
 Task entity, priority, status, and filter types.
 Matches backend REST API contracts under /api/v1/tasks/.
 */

import type { Project } from "../../projects/types";

export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ParentTaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  project: Project | null;
  parent_task: ParentTaskSummary | null;
  subtasks_count: number;
  due_at: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  estimated_minutes: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedTasksResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Task[];
}

export interface TaskFilterParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  project?: string;
  parent_task?: string;
  include_subtasks?: boolean;
  due_after?: string;
  due_before?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  project_id?: string | null;
  parent_task_id?: string | null;
  due_at?: string | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  estimated_minutes?: number | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  project_id?: string | null;
  parent_task_id?: string | null;
  due_at?: string | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  estimated_minutes?: number | null;
}

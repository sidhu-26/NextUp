import { apiClient } from "@/lib/api-client";
import type {
  CreateProjectPayload,
  Project,
  ProjectStatus,
  UpdateProjectPayload,
} from "../types";

export const projectsService = {
  /**
   * List all projects owned by authenticated user.
   */
  async listProjects(status?: ProjectStatus): Promise<Project[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiClient<Project[]>(`/api/v1/projects/${query}`, {
      method: "GET",
    });
  },

  /**
   * Retrieve project detail by UUID.
   */
  async getProject(id: string): Promise<Project> {
    return apiClient<Project>(`/api/v1/projects/${id}/`, {
      method: "GET",
    });
  },

  /**
   * Create a new project.
   */
  async createProject(payload: CreateProjectPayload): Promise<Project> {
    return apiClient<Project>("/api/v1/projects/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update an existing project.
   */
  async updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
    return apiClient<Project>(`/api/v1/projects/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete a project. Child tasks are detached (project: null).
   */
  async deleteProject(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/projects/${id}/`, {
      method: "DELETE",
    });
  },
};

"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { projectsService } from "@/features/projects/services/projects-service";
import type {
  CreateProjectPayload,
  Project,
  UpdateProjectPayload,
} from "@/features/projects/types";

interface ProjectsContextType {
  projects: Project[];
  activeProjects: Project[];
  archivedProjects: Project[];
  isLoading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
  createProject: (payload: CreateProjectPayload) => Promise<Project>;
  updateProject: (id: string, payload: UpdateProjectPayload) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<Project>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await projectsService.listProjects();
      setProjects(data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load projects");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await projectsService.listProjects();
        if (isMounted) {
          setProjects(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Failed to load projects");
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

  const createProject = async (payload: CreateProjectPayload): Promise<Project> => {
    const newProj = await projectsService.createProject(payload);
    setProjects((prev) => [newProj, ...prev]);
    return newProj;
  };

  const updateProject = async (
    id: string,
    payload: UpdateProjectPayload
  ): Promise<Project> => {
    const updated = await projectsService.updateProject(id, payload);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const deleteProject = async (id: string): Promise<void> => {
    await projectsService.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const archiveProject = async (id: string): Promise<Project> => {
    return updateProject(id, { status: "archived" });
  };

  const activeProjects = projects.filter((p) => p.status === "active");
  const archivedProjects = projects.filter((p) => p.status === "archived");

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        activeProjects,
        archivedProjects,
        isLoading,
        error,
        refreshProjects,
        createProject,
        updateProject,
        deleteProject,
        archiveProject,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectsContextType {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}

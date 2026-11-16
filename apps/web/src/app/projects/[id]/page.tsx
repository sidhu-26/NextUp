"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { projectsService } from "@/features/projects/services/projects-service";
import { tasksService } from "@/features/tasks/services/tasks-service";
import { TaskItem } from "@/features/tasks/components/task-item";
import { TaskModal } from "@/features/tasks/components/task-modal";
import { ProjectModal } from "@/features/projects/components/project-modal";
import type { Project } from "@/features/projects/types";
import type { Task } from "@/features/tasks/types";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";

export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-12 text-center text-sm text-zinc-400">Loading project...</div>
        </AppShell>
      }
    >
      <ProjectDetailContent />
    </Suspense>
  );
}

function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<Task | null>(null);

  const loadProjectData = async () => {
    setIsLoading(true);
    try {
      const [proj, taskRes] = await Promise.all([
        projectsService.getProject(projectId),
        tasksService.listTasks({
          project: projectId,
          include_subtasks: false,
          page_size: 100,
        }),
      ]);
      setProject(proj);
      setTasks(taskRes.results);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load project details");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    let isMounted = true;
    async function load() {
      try {
        const [proj, taskRes] = await Promise.all([
          projectsService.getProject(projectId),
          tasksService.listTasks({
            project: projectId,
            include_subtasks: false,
            page_size: 100,
          }),
        ]);
        if (isMounted) {
          setProject(proj);
          setTasks(taskRes.results);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Failed to load project details");
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
  }, [projectId]);

  const handleDeleteProject = async () => {
    if (!project) return;
    if (
      window.confirm(
        `Are you sure you want to delete project "${project.name}"? All associated tasks will be preserved in your Inbox.`
      )
    ) {
      await projectsService.deleteProject(project.id);
      router.push("/projects");
    }
  };

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

  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;
  const progressPercent =
    tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  return (
    <AppShell>
      {/* Project Banner Header */}
      <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full shrink-0"
              style={{ backgroundColor: project?.color || "#8B5CF6" }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-50">
                  {project?.name || "Loading..."}
                </h1>
                {project?.status === "archived" && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {project?.description || "No project description"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
            >
              Edit Project
            </button>
            <button
              onClick={handleDeleteProject}
              className="p-2 text-zinc-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Delete Project"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setTaskToEdit(null);
                setParentTaskForSubtask(null);
                setIsTaskModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xs transition"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
            <span>Progress ({progressPercent}%)</span>
            <span>
              {completedTasksCount} of {tasks.length} tasks completed
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="mt-6">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-3">
          Project Tasks ({tasks.length})
        </h2>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center text-sm text-zinc-400">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              No tasks in this project
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Add your first task to this project to start tracking your progress.
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
          void loadProjectData();
        }}
        taskToEdit={taskToEdit}
        defaultProjectId={projectId}
        defaultParentTaskId={parentTaskForSubtask?.id}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          void loadProjectData();
        }}
        projectId={project?.id}
        initialName={project?.name}
        initialDescription={project?.description}
        initialColor={project?.color}
      />
    </AppShell>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { ProjectModal } from "@/features/projects/components/project-modal";
import type { Project } from "@/features/projects/types";
import { FolderIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";

export default function ProjectsPage() {
  return (
    <AppShell>
      <ProjectsContent />
    </AppShell>
  );
}

function ProjectsContent() {
  const { activeProjects, archivedProjects, isLoading, error, deleteProject, archiveProject, updateProject } =
    useProjects();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "archived">("active");

  const displayedProjects =
    filter === "active"
      ? activeProjects
      : filter === "archived"
      ? archivedProjects
      : [...activeProjects, ...archivedProjects];

  const handleEdit = (project: Project) => {
    setProjectToEdit(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (project: Project) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${project.name}"? Tasks associated with this project will be preserved in your Inbox.`
      )
    ) {
      await deleteProject(project.id);
    }
  };

  const handleToggleArchive = async (project: Project) => {
    if (project.status === "active") {
      await archiveProject(project.id);
    } else {
      await updateProject(project.id, { status: "active" });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-50">
            Projects
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Organize tasks into structured goals, domains, and workstreams.
          </p>
        </div>

        <button
          onClick={() => {
            setProjectToEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xs transition cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2">
        {(["active", "archived", "all"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
              filter === tab
                ? "bg-violet-600 text-white"
                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-sm text-zinc-400">Loading projects...</div>
      ) : displayedProjects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <FolderIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
          <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            No projects in this view
          </p>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Create projects to categorize your responsibilities and track progress.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedProjects.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: p.color || "#8B5CF6" }}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-xs font-medium text-zinc-500 hover:text-violet-600 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="text-zinc-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      title="Delete Project"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Link href={`/projects/${p.id}`} className="group block">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-violet-600 transition">
                    {p.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                    {p.description || "No description provided."}
                  </p>
                </Link>
              </div>

              <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <Link
                  href={`/projects/${p.id}`}
                  className="font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                >
                  Open Board →
                </Link>
                <button
                  onClick={() => handleToggleArchive(p)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {p.status === "active" ? "Archive" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectToEdit?.id}
        initialName={projectToEdit?.name}
        initialDescription={projectToEdit?.description}
        initialColor={projectToEdit?.color}
      />
    </>
  );
}

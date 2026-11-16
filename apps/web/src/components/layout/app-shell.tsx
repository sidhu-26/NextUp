"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TaskModal } from "@/features/tasks/components/task-modal";
import { ProjectsProvider } from "@/features/projects/hooks/use-projects";
import { TasksProvider } from "@/features/tasks/hooks/use-tasks";
import { ProtectedRoute } from "@/features/auth/components";
import type { Task } from "@/features/tasks/types";

interface AppShellProps {
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export function AppShell({ children, searchQuery, onSearchChange }: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState<Task | null>(null);

  const handleOpenNewTask = () => {
    setSelectedTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  return (
    <ProtectedRoute>
      <ProjectsProvider>
        <TasksProvider>
          <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            {/* Sidebar */}
            <Sidebar
              isMobileOpen={isMobileOpen}
              onMobileClose={() => setIsMobileOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Header
                onOpenMobileMenu={() => setIsMobileOpen(true)}
                onOpenNewTaskModal={handleOpenNewTask}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
              />

              <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-6">{children}</div>
              </main>
            </div>

            {/* Quick Add Task Modal */}
            <TaskModal
              isOpen={isTaskModalOpen}
              onClose={() => setIsTaskModalOpen(false)}
              taskToEdit={selectedTaskToEdit}
            />
          </div>
        </TasksProvider>
      </ProjectsProvider>
    </ProtectedRoute>
  );
}

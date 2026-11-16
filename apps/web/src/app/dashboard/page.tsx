"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { tasksService } from "@/features/tasks/services/tasks-service";
import { projectsService } from "@/features/projects/services/projects-service";
import type { Task } from "@/features/tasks/types";
import type { Project } from "@/features/projects/types";
import { TaskItem } from "@/features/tasks/components/task-item";
import { TaskModal } from "@/features/tasks/components/task-modal";
import { ProjectModal } from "@/features/projects/components/project-modal";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  DashboardIcon,
  FolderIcon,
  PlusIcon,
} from "@/components/ui/icons";

export default function DashboardPage() {
  const [totalCount, setTotalCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

    // Modals state
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [parentTaskForSubtask, setParentTaskForSubtask] = useState<Task | null>(null);

      const loadDashboardData = async () => {
        setIsLoading(true);
        try {
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
          const endOfNext7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

          const [allRes, compRes, todayRes, upcomingRes, projRes] = await Promise.all([
            tasksService.listTasks({ page_size: 1 }),
            tasksService.listTasks({ status: "completed", page_size: 1 }),
            tasksService.listTasks({
              due_after: startOfToday,
              due_before: endOfToday,
              page_size: 10,
            }),
            tasksService.listTasks({
              due_after: endOfToday,
              due_before: endOfNext7Days,
              page_size: 5,
            }),
            projectsService.listProjects("active"),
          ]);

          setTotalCount(allRes.count);
          setCompletedCount(compRes.count);
          setTodayTasks(todayRes.results);
          setUpcomingTasks(upcomingRes.results);
          setRecentProjects(projRes.slice(0, 5));
        } catch {
          // Ignored: fallback to empty state
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
            const endOfNext7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

            const [allRes, compRes, todayRes, upcomingRes, projRes] = await Promise.all([
              tasksService.listTasks({ page_size: 1 }),
              tasksService.listTasks({ status: "completed", page_size: 1 }),
              tasksService.listTasks({
                due_after: startOfToday,
                due_before: endOfToday,
                page_size: 10,
              }),
              tasksService.listTasks({
                due_after: endOfToday,
                due_before: endOfNext7Days,
                page_size: 5,
              }),
              projectsService.listProjects("active"),
            ]);

            if (isMounted) {
              setTotalCount(allRes.count);
              setCompletedCount(compRes.count);
              setTodayTasks(todayRes.results);
              setUpcomingTasks(upcomingRes.results);
              setRecentProjects(projRes.slice(0, 5));
            }
          } catch {
            // Ignored: fallback to empty state
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

      const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const handleEditTask = (task: Task) => {
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
                {/* Metric Cards Banner (matching dashboard screenshot) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Total Tasks */}
                  <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 flex items-center justify-center">
                        <DashboardIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{totalCount}</p>
                        <p className="text-xs text-zinc-400 font-medium">Total Tasks</p>
                      </div>
                    </div>
                  </div>

                        {/* Completed */}
                        <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
                              <CheckCircleIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{completedCount}</p>
                              <p className="text-xs text-zinc-400 font-medium">Completed</p>
                            </div>
                          </div>
                        </div>

                        {/* Due Today */}
                        <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center">
                              <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{todayTasks.length}</p>
                              <p className="text-xs text-zinc-400 font-medium">Due Today</p>
                            </div>
                          </div>
                        </div>

                        {/* Upcoming */}
                        <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center">
                              <ClockIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{upcomingTasks.length}</p>
                              <p className="text-xs text-zinc-400 font-medium">Next 7 Days</p>
                            </div>
                        </div>
                      </div>
                  </div>

                    {/* Main Grid: Today's Tasks + Progress & Quick Actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Today's Tasks Column (2 cols wide) */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs">
                          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                            <div>
                              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                Today&apos;s Tasks ({todayTasks.length})
                              </h2>
                              <p className="text-xs text-zinc-400">Scheduled for today</p>
                            </div>
                            <Link
                              href="/today"
                              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                            >
                              View All →
                            </Link>
                          </div>

                          <div className="mt-4">
                            {isLoading ? (
                              <p className="text-xs text-zinc-400 py-6 text-center">Loading tasks...</p>
                            ) : todayTasks.length === 0 ? (
                              <div className="text-center py-8">
                                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                  No tasks due today 🎉
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">
                                  Relax or plan upcoming items.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {todayTasks.map((t) => (
                                  <TaskItem
                                    key={t.id}
                                    task={t}
                                    onEdit={handleEditTask}
                                    onAddSubtask={handleAddSubtask}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Recent Projects Summary */}
                        <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs">
                          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                              Active Projects
                            </h2>
                            <Link
                              href="/projects"
                              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                            >
                              View All →
                            </Link>
                          </div>

                          <div className="mt-4 space-y-3">
                            {recentProjects.map((p) => (
                              <Link
                                key={p.id}
                                href={`/projects/${p.id}`}
                                className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 transition"
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className="w-3.5 h-3.5 rounded-full"
                                    style={{ backgroundColor: p.color || "#8B5CF6" }}
                                  />
                                  <div>
                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                      {p.name}
                                    </p>
                                    <p className="text-xs text-zinc-400">
                                      {p.description || "No description"}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold text-zinc-500">→</span>
                              </Link>
                            ))}

                            {recentProjects.length === 0 && (
                              <p className="text-xs text-zinc-400 italic text-center py-4">
                                No active projects yet.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                  {/* Right Sidebar: Progress Circle & Quick Actions */}
                  <div className="space-y-6">
                    {/* Progress Card */}
                    <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs text-center">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 text-left mb-4">
                        Task Progress
                      </h3>

                      <div className="relative inline-flex items-center justify-center my-2">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="52"
                            className="stroke-zinc-100 dark:stroke-zinc-800"
                            strokeWidth="10"
                            fill="transparent"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="52"
                            className="stroke-violet-600 transition-all duration-500 ease-in-out"
                            strokeWidth="10"
                            strokeDasharray={326.7}
                            strokeDashoffset={326.7 - (326.7 * completionPercent) / 100}
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                            {completionPercent}%
                          </span>
                          <span className="text-2xs text-zinc-400 uppercase tracking-wider font-semibold">
                            Completed
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                        <div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {completedCount}
                          </span>{" "}
                          Done
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {Math.max(0, totalCount - completedCount)}
                          </span>{" "}
                          Remaining
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                        Quick Actions
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            setTaskToEdit(null);
                            setParentTaskForSubtask(null);
                            setIsTaskModalOpen(true);
                          }}
                          className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-center transition cursor-pointer"
                        >
                          <PlusIcon className="w-5 h-5 mx-auto text-violet-600 mb-1" />
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                            New Task
                          </span>
                        </button>

                        <button
                          onClick={() => setIsProjectModalOpen(true)}
                          className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-center transition cursor-pointer"
                        >
                          <FolderIcon className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                            New Project
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <TaskModal
                  isOpen={isTaskModalOpen}
                  onClose={() => {
                    setIsTaskModalOpen(false);
                    void loadDashboardData();
                  }}
                  taskToEdit={taskToEdit}
                  defaultParentTaskId={parentTaskForSubtask?.id}
                />

                <ProjectModal
                  isOpen={isProjectModalOpen}
                  onClose={() => {
                    setIsProjectModalOpen(false);
                    void loadDashboardData();
                  }}
                />
              </AppShell>
              );
}

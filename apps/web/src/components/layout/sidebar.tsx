"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { ProjectModal } from "@/features/projects/components/project-modal";
import {
  CalendarIcon,
  ClockIcon,
  DashboardIcon,
  InboxIcon,
  PlusIcon,
  SettingsIcon,
  XMarkIcon,
} from "@/components/ui/icons";

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { activeProjects, archivedProjects } = useProjects();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const navLinks = [
    { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
    { label: "Calendar", href: "/calendar", icon: CalendarIcon },
    { label: "Inbox", href: "/tasks", icon: InboxIcon },
    { label: "Today", href: "/today", icon: CalendarIcon },
    { label: "Upcoming", href: "/upcoming", icon: ClockIcon },
    { label: "Projects", href: "/projects", icon: CalendarIcon },
    { label: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
      {/* Branding Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-900">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold shadow-xs">
            ↑
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            NextUP
          </span>
        </Link>
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg"
          aria-label="Close sidebar"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <div>
          <nav className="space-y-1">
            {navLinks.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-violet-600 dark:text-violet-400" : "text-zinc-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Projects
            </span>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="p-1 rounded-md text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition cursor-pointer"
              title="Add Project"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {activeProjects.map((proj) => {
              const isProjActive = pathname === `/projects/${proj.id}`;
              return (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  onClick={onMobileClose}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-sm transition ${
                    isProjActive
                      ? "bg-zinc-100 dark:bg-zinc-800/80 font-medium text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:text-zinc-900"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: proj.color || "#8B5CF6" }}
                  />
                  <span className="truncate">{proj.name}</span>
                </Link>
              );
            })}

            {activeProjects.length === 0 && (
              <p className="px-3 text-xs text-zinc-400 italic">No active projects</p>
            )}

            {/* Archived projects trigger */}
            {archivedProjects.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowArchived((v) => !v)}
                  className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center justify-between w-full"
                >
                  <span>Archived ({archivedProjects.length})</span>
                  <span>{showArchived ? "▲" : "▼"}</span>
                </button>
                {showArchived && (
                  <div className="mt-1 space-y-1 pl-2">
                    {archivedProjects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        onClick={onMobileClose}
                        className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 truncate"
                      >
                        <span className="w-2 h-2 rounded-full bg-zinc-400" />
                        <span className="truncate">{p.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User profile & quick sign out */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-full bg-violet-600/10 text-violet-600 dark:bg-violet-950 dark:text-violet-300 flex items-center justify-center font-bold text-sm shrink-0">
            {user?.username ? user.username[0].toUpperCase() : "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {user?.username}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => void logout()}
          className="text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
          title="Sign Out"
        >
          Logout
        </button>
      </div>

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 md:hidden flex"
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onMobileClose}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

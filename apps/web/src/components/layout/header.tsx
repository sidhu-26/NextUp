"use client";

import React from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Bars3Icon, PlusIcon, SearchIcon } from "@/components/ui/icons";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenNewTaskModal?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export function Header({
  onOpenMobileMenu,
  onOpenNewTaskModal,
  searchQuery = "",
  onSearchChange,
}: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3.5 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition"
          aria-label="Open navigation menu"
        >
          <Bars3Icon className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Good day, {user?.username || "Planner"} 👋
          </h1>
          <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400">
            Organize, prioritize, and conquer your next milestones.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Search Input */}
        {onSearchChange && (
          <div className="relative hidden sm:block w-48 md:w-64">
            <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-1.5 text-xs md:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>
        )}

        {/* New Task Button */}
        {onOpenNewTaskModal && (
          <button
            onClick={onOpenNewTaskModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:scale-95 rounded-xl shadow-xs transition cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Task</span>
          </button>
        )}
      </div>
    </header>
  );
}

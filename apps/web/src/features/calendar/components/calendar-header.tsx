"use client";

import React from "react";
import type { CalendarViewMode } from "../types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { POPULAR_TIMEZONES } from "../utils/date-utils";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onNavigateToday: () => void;
  onNewTaskClick: () => void;
  timeZone: string;
  onTimeZoneChange: (tz: string) => void;
  is24Hour: boolean;
  onToggle24Hour: () => void;
  isBacklogOpen: boolean;
  onToggleBacklog: () => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  onNewTaskClick,
  timeZone,
  onTimeZoneChange,
  is24Hour,
  onToggle24Hour,
  isBacklogOpen,
  onToggleBacklog,
}: CalendarHeaderProps) {
  // Format current date label depending on viewMode
  const getHeaderDateLabel = () => {
    const opts: Intl.DateTimeFormatOptions = { timeZone };
    if (viewMode === "day") {
      opts.weekday = "short";
      opts.month = "long";
      opts.day = "numeric";
      opts.year = "numeric";
      return new Intl.DateTimeFormat("en-US", opts).format(currentDate);
    }
    if (viewMode === "month") {
      opts.month = "long";
      opts.year = "numeric";
      return new Intl.DateTimeFormat("en-US", opts).format(currentDate);
    }
    // Week view: Month and Year
    opts.month = "long";
    opts.year = "numeric";
    return new Intl.DateTimeFormat("en-US", opts).format(currentDate);
  };

  return (
    <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      {/* Navigation & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900 shadow-2xs">
          <button
            onClick={onNavigatePrev}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
            aria-label="Previous period"
            title="Previous"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateToday}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 border-x border-zinc-200 dark:border-zinc-800 transition"
          >
            Today
          </button>
          <button
            onClick={onNavigateNext}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
            aria-label="Next period"
            title="Next"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        <h1 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100 min-w-[170px]">
          {getHeaderDateLabel()}
        </h1>
      </div>

      {/* View Switcher, Timezone, Backlog, and Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* View Switcher */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl text-xs font-medium">
          {(["day", "week", "month"] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1.5 rounded-lg capitalize transition cursor-pointer ${
                viewMode === mode
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* 12h / 24h Toggle */}
        <button
          onClick={onToggle24Hour}
          className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
          title="Toggle 12h / 24h format"
        >
          {is24Hour ? "24h" : "12h"}
        </button>

        {/* Timezone Selector */}
        <div className="relative">
          <select
            value={timeZone}
            onChange={(e) => onTimeZoneChange(e.target.value)}
            className="text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-600 cursor-pointer"
            title="Calendar Display Timezone"
          >
            {!POPULAR_TIMEZONES.includes(timeZone) && (
              <option value={timeZone}>{timeZone}</option>
            )}
            {POPULAR_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {/* Backlog Side Panel Toggle */}
        <button
          onClick={onToggleBacklog}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
            isBacklogOpen
              ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800"
              : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          }`}
          title="Toggle Unscheduled Task Backlog Panel"
        >
          Backlog
        </button>

        {/* New Task Button */}
        <button
          onClick={onNewTaskClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>
    </header>
  );
}

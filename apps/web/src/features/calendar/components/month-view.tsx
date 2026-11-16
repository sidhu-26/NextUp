"use client";

import React from "react";
import type { Task } from "@/features/tasks/types";
import {
  formatZonedDateKey,
  getMonthGridDays,
  getZonedDateParts,
} from "../utils/date-utils";

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  timeZone: string;
  onSelectTask: (task: Task) => void;
  onDayClick: (date: Date) => void;
}

export function MonthView({
  currentDate,
  tasks,
  timeZone,
  onSelectTask,
  onDayClick,
}: MonthViewProps) {
  const gridDays = getMonthGridDays(currentDate);
  const currentMonth = currentDate.getMonth();
  const todayKey = formatZonedDateKey(new Date(), timeZone);

  // Map tasks by dayKey
  const tasksByDayKey: Record<string, Task[]> = {};
  tasks.forEach((t) => {
    if (!t.scheduled_start_at) return;
    const key = formatZonedDateKey(new Date(t.scheduled_start_at), timeZone);
    if (!tasksByDayKey[key]) tasksByDayKey[key] = [];
    tasksByDayKey[key].push(t);
  });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col flex-1 h-full min-w-[700px] overflow-hidden select-none bg-white dark:bg-zinc-950">
      {/* Weekday Names Header */}
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 sticky top-0 z-10">
        {weekdays.map((w) => (
          <div
            key={w}
            className="py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase border-r last:border-r-0 border-zinc-200 dark:border-zinc-800"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
        {gridDays.map((day) => {
          const dayKey = formatZonedDateKey(day, timeZone);
          const isToday = dayKey === todayKey;
          const isCurrentMonth = day.getMonth() === currentMonth;
          const dayParts = getZonedDateParts(day, timeZone);
          const dayTasks = tasksByDayKey[dayKey] || [];
          const maxVisible = 3;
          const visibleTasks = dayTasks.slice(0, maxVisible);
          const overflowCount = dayTasks.length - maxVisible;

          return (
            <div
              key={dayKey}
              onClick={() => onDayClick(day)}
              className={`min-h-[100px] p-2 border-b border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 ${
                !isCurrentMonth
                  ? "bg-zinc-50/40 dark:bg-zinc-900/20 text-zinc-400 dark:text-zinc-600"
                  : isToday
                    ? "bg-violet-50/30 dark:bg-violet-950/20"
                    : "bg-white dark:bg-zinc-950"
              }`}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${
                    isToday
                      ? "bg-violet-600 text-white shadow-2xs font-bold"
                      : isCurrentMonth
                        ? "text-zinc-800 dark:text-zinc-200"
                        : "text-zinc-400 dark:text-zinc-600"
                  }`}
                >
                  {dayParts.day}
                </span>

                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                  </span>
                )}
              </div>

              {/* Task Items */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {visibleTasks.map((t) => {
                  const isCompleted = t.status === "completed";
                  const color = t.project?.color || "#6366F1";
                  return (
                    <div
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTask(t);
                      }}
                      style={{ borderLeftColor: color }}
                      className={`px-1.5 py-0.5 rounded text-[11px] truncate border border-zinc-200 dark:border-zinc-800 border-l-3 shadow-2xs transition hover:brightness-95 ${
                        isCompleted
                          ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 line-through"
                          : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium"
                      }`}
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  );
                })}

                {overflowCount > 0 && (
                  <div className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 pl-1">
                    +{overflowCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

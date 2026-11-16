"use client";

import React, { useRef, useEffect } from "react";
import type { Task } from "@/features/tasks/types";
import {
  formatHourLabel,
  formatZonedDateKey,
  getZonedDateParts,
  getWeekDays,
  getStartOfWeek,
} from "../utils/date-utils";
import { TimeBlock } from "./time-block";

interface WeekViewProps {
  currentDate: Date;
  tasks: Task[];
  timeZone: string;
  is24Hour: boolean;
  onSelectTask: (task: Task) => void;
  onCompleteToggle: (task: Task, e: React.MouseEvent) => void;
  onUnscheduleTask: (task: Task, e: React.MouseEvent) => void;
  onDragStartTask: (task: Task, e: React.DragEvent) => void;
  onResizeTask: (task: Task, newMinutesDuration: number) => void;
  onSlotClick: (date: Date, hour: number, minute: number) => void;
  onDropOnSlot: (date: Date, hour: number, minute: number, e: React.DragEvent) => void;
}

export function WeekView({
  currentDate,
  tasks,
  timeZone,
  is24Hour,
  onSelectTask,
  onCompleteToggle,
  onUnscheduleTask,
  onDragStartTask,
  onResizeTask,
  onSlotClick,
  onDropOnSlot,
}: WeekViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const weekStart = getStartOfWeek(currentDate);
  const weekDays = getWeekDays(weekStart);

  // Auto-scroll to working hours (e.g. 8:00 AM = 8 * 60px = 480px) on initial load
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 480;
    }
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const todayKey = formatZonedDateKey(new Date(), timeZone);

  // Map tasks into day columns based on scheduled_start_at zoned date
  const tasksByDayKey: Record<string, Task[]> = {};
  weekDays.forEach((day) => {
    tasksByDayKey[formatZonedDateKey(day, timeZone)] = [];
  });

  tasks.forEach((task) => {
    if (!task.scheduled_start_at || !task.scheduled_end_at) return;
    const taskStartDate = new Date(task.scheduled_start_at);
    const dayKey = formatZonedDateKey(taskStartDate, timeZone);
    if (tasksByDayKey[dayKey]) {
      tasksByDayKey[dayKey].push(task);
    }
  });

  // Calculate current-time indicator position if viewing today
  const now = new Date();
  const nowParts = getZonedDateParts(now, timeZone);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className="flex flex-col flex-1 h-full min-w-[700px] overflow-hidden select-none bg-white dark:bg-zinc-950">
      {/* Week Header Row */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 sticky top-0 z-20">
        {/* Timezone label header column */}
        <div className="w-16 shrink-0 p-3 text-[10px] font-semibold text-zinc-400 uppercase text-center border-r border-zinc-200 dark:border-zinc-800">
          Time
        </div>

        {/* 7 Day Columns */}
        <div className="grid grid-cols-7 flex-1">
          {weekDays.map((day) => {
            const dayKey = formatZonedDateKey(day, timeZone);
            const isToday = dayKey === todayKey;
            const dayParts = getZonedDateParts(day, timeZone);
            const weekdayName = new Intl.DateTimeFormat("en-US", {
              timeZone,
              weekday: "short",
            }).format(day);

            return (
              <div
                key={dayKey}
                className={`py-2 px-1 text-center border-r border-zinc-200 dark:border-zinc-800 ${
                  isToday ? "bg-violet-50/50 dark:bg-violet-950/20" : ""
                }`}
              >
                <div className="text-[11px] font-medium text-zinc-500 uppercase">
                  {weekdayName}
                </div>
                <div
                  className={`inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full mt-0.5 ${
                    isToday
                      ? "bg-violet-600 text-white shadow-2xs"
                      : "text-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {dayParts.day}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly Timeline Grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative scroll-smooth"
      >
        <div className="flex relative" style={{ height: "1440px" }}>
          {/* Time Gutter (24 Hours, 60px each) */}
          <div className="w-16 shrink-0 border-r border-zinc-200 dark:border-zinc-800 relative select-none">
            {hours.map((h) => (
              <div
                key={h}
                style={{ top: `${h * 60}px` }}
                className="absolute left-0 right-0 h-[60px] border-b border-zinc-100 dark:border-zinc-900/60 text-right pr-2 text-[10px] font-medium text-zinc-400"
              >
                <span className="-translate-y-2 inline-block">
                  {h === 0 ? "" : formatHourLabel(h, is24Hour)}
                </span>
              </div>
            ))}
          </div>

          {/* 7 Days Columns */}
          <div className="grid grid-cols-7 flex-1 relative">
            {weekDays.map((day) => {
              const dayKey = formatZonedDateKey(day, timeZone);
              const isToday = dayKey === todayKey;
              const dayTasks = tasksByDayKey[dayKey] || [];

              return (
                <div
                  key={dayKey}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clientY = e.clientY - rect.top;
                    // 1px = 1 min. Snap to 15-min intervals
                    const snappedMinute = Math.round(clientY / 15) * 15;
                    const clamped = Math.max(0, Math.min(1425, snappedMinute));
                    const hour = Math.floor(clamped / 60);
                    const minute = clamped % 60;
                    onDropOnSlot(day, hour, minute, e);
                  }}
                  className={`relative border-r border-zinc-200 dark:border-zinc-800 h-full ${
                    isToday ? "bg-violet-50/20 dark:bg-violet-950/10" : ""
                  }`}
                >
                  {/* Hour horizontal grid lines */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      style={{ top: `${h * 60}px` }}
                      onClick={() => onSlotClick(day, h, 0)}
                      className="absolute left-0 right-0 h-[60px] border-b border-zinc-100 dark:border-zinc-900/60 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors cursor-pointer"
                    >
                      {/* Subtle 30-min dashed division */}
                      <div className="absolute top-[30px] left-0 right-0 border-b border-dashed border-zinc-100/70 dark:border-zinc-900/40" />
                    </div>
                  ))}

                  {/* Current Time Indicator on today */}
                  {isToday && (
                    <div
                      style={{ top: `${nowMinutes}px` }}
                      className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.25 shadow-xs" />
                      <div className="flex-1 border-t-2 border-red-500 shadow-2xs" />
                    </div>
                  )}

                  {/* Render Task Blocks */}
                  {dayTasks.map((task) => {
                    const startParts = getZonedDateParts(
                      new Date(task.scheduled_start_at!),
                      timeZone
                    );
                    const endParts = getZonedDateParts(
                      new Date(task.scheduled_end_at!),
                      timeZone
                    );

                    const startMin = startParts.hour * 60 + startParts.minute;
                    const endMin = endParts.hour * 60 + endParts.minute;
                    const duration = Math.max(15, endMin - startMin);

                    return (
                      <TimeBlock
                        key={task.id}
                        task={task}
                        timeZone={timeZone}
                        is24Hour={is24Hour}
                        top={startMin}
                        height={duration}
                        onSelect={onSelectTask}
                        onCompleteToggle={onCompleteToggle}
                        onUnschedule={onUnscheduleTask}
                        onDragStart={onDragStartTask}
                        onResizeEnd={onResizeTask}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

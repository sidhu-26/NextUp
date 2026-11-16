"use client";

import React, { useRef, useEffect } from "react";
import type { Task } from "@/features/tasks/types";
import {
  formatHourLabel,
  formatZonedDateKey,
  getZonedDateParts,
} from "../utils/date-utils";
import { TimeBlock } from "./time-block";

interface DayViewProps {
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

export function DayView({
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
}: DayViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const currentDayKey = formatZonedDateKey(currentDate, timeZone);
  const todayKey = formatZonedDateKey(new Date(), timeZone);
  const isToday = currentDayKey === todayKey;

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 480; // 8:00 AM
    }
  }, [currentDate]);

  // Filter tasks belonging to current day
  const dayTasks = tasks.filter((t) => {
    if (!t.scheduled_start_at || !t.scheduled_end_at) return false;
    const taskStartDate = new Date(t.scheduled_start_at);
    return formatZonedDateKey(taskStartDate, timeZone) === currentDayKey;
  });

  const now = new Date();
  const nowParts = getZonedDateParts(now, timeZone);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className="flex flex-col flex-1 h-full min-w-[500px] overflow-hidden select-none bg-white dark:bg-zinc-950">
      {/* Day Banner */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 sticky top-0 z-20">
        <div className="w-20 shrink-0 p-3 text-[10px] font-semibold text-zinc-400 uppercase text-center border-r border-zinc-200 dark:border-zinc-800">
          Timeline
        </div>
        <div className="flex-1 py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-bold ${
                isToday ? "text-violet-600 dark:text-violet-400" : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {new Intl.DateTimeFormat("en-US", {
                timeZone,
                weekday: "long",
                month: "long",
                day: "numeric",
              }).format(currentDate)}
            </span>
            {isToday && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                Today
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-400">
            {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"} scheduled
          </span>
        </div>
      </div>

      {/* Hourly Timeline */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative scroll-smooth"
      >
        <div className="flex relative" style={{ height: "1440px" }}>
          {/* Time Gutter */}
          <div className="w-20 shrink-0 border-r border-zinc-200 dark:border-zinc-800 relative select-none">
            {hours.map((h) => (
              <div
                key={h}
                style={{ top: `${h * 60}px` }}
                className="absolute left-0 right-0 h-[60px] border-b border-zinc-100 dark:border-zinc-900/60 text-right pr-3 text-xs font-medium text-zinc-400"
              >
                <span className="-translate-y-2 inline-block">
                  {h === 0 ? "" : formatHourLabel(h, is24Hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Single Full-Day Column */}
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const clientY = e.clientY - rect.top;
              const snappedMinute = Math.round(clientY / 15) * 15;
              const clamped = Math.max(0, Math.min(1425, snappedMinute));
              const hour = Math.floor(clamped / 60);
              const minute = clamped % 60;
              onDropOnSlot(currentDate, hour, minute, e);
            }}
            className="flex-1 relative h-full"
          >
            {/* Hour horizontal slots */}
            {hours.map((h) => (
              <div
                key={h}
                style={{ top: `${h * 60}px` }}
                onClick={() => onSlotClick(currentDate, h, 0)}
                className="absolute left-0 right-0 h-[60px] border-b border-zinc-100 dark:border-zinc-900/60 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors cursor-pointer group"
              >
                {/* 30m divider */}
                <div className="absolute top-[30px] left-0 right-0 border-b border-dashed border-zinc-100/70 dark:border-zinc-900/40" />
                <span className="opacity-0 group-hover:opacity-100 absolute left-4 top-2 text-[10px] text-violet-500 font-medium">
                  + Click to schedule at {formatHourLabel(h, is24Hour)}
                </span>
              </div>
            ))}

            {/* Current Time Line */}
            {isToday && (
              <div
                style={{ top: `${nowMinutes}px` }}
                className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
              >
                <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shadow-xs" />
                <div className="flex-1 border-t-2 border-red-500 shadow-2xs" />
              </div>
            )}

            {/* Task blocks */}
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
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import type { Task } from "@/features/tasks/types";
import { tasksService } from "@/features/tasks/services/tasks-service";
import { useTasks } from "@/features/tasks/hooks/use-tasks";
import { TaskModal } from "@/features/tasks/components/task-modal";
import { CalendarHeader } from "./calendar-header";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { MonthView } from "./month-view";
import { UnscheduledPanel } from "./unscheduled-panel";
import { ConflictDialog } from "./conflict-dialog";
import type { CalendarViewMode, DragItem } from "../types";
import {
  getDefaultTimezone,
  getStartOfWeek,
  createUtcFromZonedParts,
  getZonedDateParts,
} from "../utils/date-utils";

export function CalendarContainer() {
  const { completeTask, reopenTask } = useTasks();
  const [, startTransition] = useTransition();

  // State
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [timeZone, setTimeZone] = useState<string>(() => getDefaultTimezone());
  const [is24Hour, setIs24Hour] = useState<boolean>(false);
  const [isBacklogOpen, setIsBacklogOpen] = useState<boolean>(true);
  const [backlogRefreshKey, setBacklogRefreshKey] = useState<number>(0);

  // Scheduled tasks for the currently visible range
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Modal & Selection state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalDefaultStart, setModalDefaultStart] = useState<string | null>(null);
  const [modalDefaultEnd, setModalDefaultEnd] = useState<string | null>(null);

  // Drag & Drop
  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);

  // Conflict Dialog
  const [conflictDialogOpen, setConflictDialogOpen] = useState<boolean>(false);
  const [conflictTargetTask, setConflictTargetTask] = useState<Task | null>(null);
  const [conflictProposedStart, setConflictProposedStart] = useState<string | null>(null);
  const [conflictProposedEnd, setConflictProposedEnd] = useState<string | null>(null);
  const [conflictList, setConflictList] = useState<Task[]>([]);

  // Compute date range for query based on viewMode
  const getQueryRange = useCallback(() => {
    let rangeStart: Date;
    let rangeEnd: Date;

    if (viewMode === "day") {
      rangeStart = new Date(currentDate);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(currentDate);
      rangeEnd.setHours(23, 59, 59, 999);
    } else if (viewMode === "month") {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      // Include padding days (start of previous month to end of next month)
      rangeStart = new Date(year, month - 1, 20);
      rangeEnd = new Date(year, month + 2, 10);
    } else {
      // Week view (7 days)
      const weekStart = getStartOfWeek(currentDate);
      rangeStart = new Date(weekStart);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(weekStart);
      rangeEnd.setDate(rangeStart.getDate() + 7);
    }

    return {
      scheduled_from: rangeStart.toISOString(),
      scheduled_to: rangeEnd.toISOString(),
    };
  }, [currentDate, viewMode]);

  // Load calendar tasks
  const loadCalendarTasks = useCallback(async () => {
    const range = getQueryRange();
    setIsLoading(true);
    try {
      const res = await tasksService.listTasks({
        scheduled_from: range.scheduled_from,
        scheduled_to: range.scheduled_to,
        page_size: 100,
      });
      setTasks(res.results);
    } catch {
      // Failed to load
    } finally {
      setIsLoading(false);
    }
  }, [getQueryRange]);

  useEffect(() => {
    let ignore = false;
    async function execute() {
      setIsLoading(true);
      const range = getQueryRange();
      try {
        const res = await tasksService.listTasks({
          scheduled_from: range.scheduled_from,
          scheduled_to: range.scheduled_to,
          page_size: 100,
        });
        if (!ignore) {
          setTasks(res.results);
        }
      } catch {
        // Failed to load
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    void execute();
    return () => {
      ignore = true;
    };
  }, [getQueryRange]);

  // Navigation handlers
  const handleNavigatePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "day") next.setDate(prev.getDate() - 1);
      else if (viewMode === "week") next.setDate(prev.getDate() - 7);
      else if (viewMode === "month") next.setMonth(prev.getMonth() - 1);
      return next;
    });
  };

  const handleNavigateNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "day") next.setDate(prev.getDate() + 1);
      else if (viewMode === "week") next.setDate(prev.getDate() + 7);
      else if (viewMode === "month") next.setMonth(prev.getMonth() + 1);
      return next;
    });
  };

  const handleNavigateToday = () => {
    setCurrentDate(new Date());
  };

  // Open modal for slot click
  const handleSlotClick = (date: Date, hour: number, minute: number) => {
    const parts = getZonedDateParts(date, timeZone);
    const startUtc = createUtcFromZonedParts(
      parts.year,
      parts.month,
      parts.day,
      hour,
      minute,
      timeZone
    );
    const endUtc = new Date(startUtc.getTime() + 45 * 60 * 1000); // 45 min default slot

    setSelectedTask(null);
    setModalDefaultStart(startUtc.toISOString());
    setModalDefaultEnd(endUtc.toISOString());
    setIsModalOpen(true);
  };

  // Drag start
  const handleDragStartTask = (task: Task, e: React.DragEvent) => {
    const isBacklog = !task.scheduled_start_at;
    let duration = 30;
    if (task.scheduled_start_at && task.scheduled_end_at) {
      const s = new Date(task.scheduled_start_at).getTime();
      const en = new Date(task.scheduled_end_at).getTime();
      duration = Math.max(15, Math.round((en - s) / 60000));
    } else if (task.estimated_minutes) {
      duration = Math.max(15, task.estimated_minutes);
    }

    const item: DragItem = {
      type: isBacklog ? "backlog_task" : "scheduled_task",
      task,
      durationMinutes: duration,
    };
    setActiveDragItem(item);
    e.dataTransfer.setData("text/plain", JSON.stringify(item));
  };

  // Persist schedule changes (with optimistic update and rollback)
  const commitScheduleChange = async (
    task: Task,
    newStartIso: string,
    newEndIso: string
  ) => {
    setSaveStatus("Saving schedule...");
    const previousTasks = [...tasks];

    // Optimistic update
    const optimisticUpdated: Task = {
      ...task,
      scheduled_start_at: newStartIso,
      scheduled_end_at: newEndIso,
    };
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id);
      if (exists) {
        return prev.map((t) => (t.id === task.id ? optimisticUpdated : t));
      }
      return [...prev, optimisticUpdated];
    });

    try {
      const saved = await tasksService.updateTask(task.id, {
        scheduled_start_at: newStartIso,
        scheduled_end_at: newEndIso,
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? saved : t)));
      setSaveStatus(null);
      setBacklogRefreshKey((k) => k + 1);
    } catch {
      // Revert optimistic change on error
      setTasks(previousTasks);
      setSaveStatus("Error saving schedule. Reverted.");
      setTimeout(() => setSaveStatus(null), 3500);
    }
  };

  // Perform schedule with proactive conflict check
  const scheduleTaskWithConflictCheck = async (
    task: Task,
    startIso: string,
    endIso: string
  ) => {
    try {
      const conflictsData = await tasksService.checkConflicts(
        startIso,
        endIso,
        task.id
      );
      if (conflictsData.has_conflicts) {
        setConflictTargetTask(task);
        setConflictProposedStart(startIso);
        setConflictProposedEnd(endIso);
        setConflictList(conflictsData.conflicts);
        setConflictDialogOpen(true);
        return;
      }
    } catch {
      // If conflict check fails, proceed with normal save
    }

    await commitScheduleChange(task, startIso, endIso);
  };

  // Handle drop on time slot
  const handleDropOnSlot = async (
    date: Date,
    hour: number,
    minute: number,
    e: React.DragEvent
  ) => {
    let item = activeDragItem;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData("text/plain");
        if (raw) item = JSON.parse(raw);
      } catch {
        return;
      }
    }
    if (!item) return;

    const parts = getZonedDateParts(date, timeZone);
    const startUtc = createUtcFromZonedParts(
      parts.year,
      parts.month,
      parts.day,
      hour,
      minute,
      timeZone
    );
    const durationMs = (item.durationMinutes || 30) * 60 * 1000;
    const endUtc = new Date(startUtc.getTime() + durationMs);

    setActiveDragItem(null);
    await scheduleTaskWithConflictCheck(
      item.task,
      startUtc.toISOString(),
      endUtc.toISOString()
    );
  };

  // Handle duration resizing
  const handleResizeTask = async (task: Task, newMinutesDuration: number) => {
    if (!task.scheduled_start_at) return;
    const startUtc = new Date(task.scheduled_start_at);
    const newEndUtc = new Date(startUtc.getTime() + newMinutesDuration * 60 * 1000);

    await scheduleTaskWithConflictCheck(
      task,
      startUtc.toISOString(),
      newEndUtc.toISOString()
    );
  };

  // Remove task from calendar (unschedule)
  const handleUnscheduleTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaveStatus("Removing from calendar...");
    const previous = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    try {
      await tasksService.updateTask(task.id, {
        scheduled_start_at: null,
        scheduled_end_at: null,
      });
      setSaveStatus(null);
      setBacklogRefreshKey((k) => k + 1);
    } catch {
      setTasks(previous);
      setSaveStatus("Error updating task. Reverted.");
      setTimeout(() => setSaveStatus(null), 3500);
    }
  };

  // Toggle completion
  const handleCompleteToggle = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (task.status === "completed") {
        const reopened = await reopenTask(task.id);
        setTasks((prev) => prev.map((t) => (t.id === task.id ? reopened : t)));
      } else {
        const completed = await completeTask(task.id);
        setTasks((prev) => prev.map((t) => (t.id === task.id ? completed : t)));
      }
    } catch {
      // Failed toggle
    }
  };

  // Quick schedule from backlog
  const handleQuickSchedule = async (task: Task) => {
    const now = new Date();
    // Schedule for next 30-min boundary
    const parts = getZonedDateParts(now, timeZone);
    const currentMin = parts.hour * 60 + parts.minute;
    const nextSlot = Math.ceil((currentMin + 15) / 30) * 30;
    const h = Math.floor(nextSlot / 60) % 24;
    const m = nextSlot % 60;

    const startUtc = createUtcFromZonedParts(
      parts.year,
      parts.month,
      parts.day,
      h,
      m,
      timeZone
    );
    const duration = task.estimated_minutes || 30;
    const endUtc = new Date(startUtc.getTime() + duration * 60 * 1000);

    await scheduleTaskWithConflictCheck(
      task,
      startUtc.toISOString(),
      endUtc.toISOString()
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Calendar Header */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={(mode) => startTransition(() => setViewMode(mode))}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        onNavigateToday={handleNavigateToday}
        onNewTaskClick={() => {
          setSelectedTask(null);
          setModalDefaultStart(null);
          setModalDefaultEnd(null);
          setIsModalOpen(true);
        }}
        timeZone={timeZone}
        onTimeZoneChange={setTimeZone}
        is24Hour={is24Hour}
        onToggle24Hour={() => setIs24Hour((prev) => !prev)}
        isBacklogOpen={isBacklogOpen}
        onToggleBacklog={() => setIsBacklogOpen((prev) => !prev)}
      />

      {/* Save / Status Toast */}
      {saveStatus && (
        <div className="bg-violet-600 text-white text-xs px-4 py-1.5 text-center font-medium shadow-xs transition-all">
          {saveStatus}
        </div>
      )}

      {/* Main Grid + Unscheduled Panel Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 flex flex-col h-full overflow-x-auto relative">
          {isLoading && (
            <div className="absolute top-2 right-4 z-40 bg-white/90 dark:bg-zinc-900/90 text-xs text-zinc-500 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
              Syncing calendar...
            </div>
          )}

          {viewMode === "week" && (
            <WeekView
              currentDate={currentDate}
              tasks={tasks}
              timeZone={timeZone}
              is24Hour={is24Hour}
              onSelectTask={(task) => {
                setSelectedTask(task);
                setIsModalOpen(true);
              }}
              onCompleteToggle={handleCompleteToggle}
              onUnscheduleTask={handleUnscheduleTask}
              onDragStartTask={handleDragStartTask}
              onResizeTask={handleResizeTask}
              onSlotClick={handleSlotClick}
              onDropOnSlot={handleDropOnSlot}
            />
          )}

          {viewMode === "day" && (
            <DayView
              currentDate={currentDate}
              tasks={tasks}
              timeZone={timeZone}
              is24Hour={is24Hour}
              onSelectTask={(task) => {
                setSelectedTask(task);
                setIsModalOpen(true);
              }}
              onCompleteToggle={handleCompleteToggle}
              onUnscheduleTask={handleUnscheduleTask}
              onDragStartTask={handleDragStartTask}
              onResizeTask={handleResizeTask}
              onSlotClick={handleSlotClick}
              onDropOnSlot={handleDropOnSlot}
            />
          )}

          {viewMode === "month" && (
            <MonthView
              currentDate={currentDate}
              tasks={tasks}
              timeZone={timeZone}
              onSelectTask={(task) => {
                setSelectedTask(task);
                setIsModalOpen(true);
              }}
              onDayClick={(date) => {
                setCurrentDate(date);
                setViewMode("day");
              }}
            />
          )}
        </main>

        {/* Collapsible Unscheduled Tasks Backlog Panel */}
        <UnscheduledPanel
          isOpen={isBacklogOpen}
          onClose={() => setIsBacklogOpen(false)}
          onDragStartTask={handleDragStartTask}
          onQuickSchedule={handleQuickSchedule}
          onSelectTask={(task) => {
            setSelectedTask(task);
            setIsModalOpen(true);
          }}
          refreshTrigger={backlogRefreshKey}
        />
      </div>

      {/* Conflict Warning Dialog */}
      <ConflictDialog
        isOpen={conflictDialogOpen}
        targetTask={conflictTargetTask}
        proposedStart={conflictProposedStart}
        proposedEnd={conflictProposedEnd}
        conflictingTasks={conflictList}
        timeZone={timeZone}
        is24Hour={is24Hour}
        onCancel={() => {
          setConflictDialogOpen(false);
          setConflictTargetTask(null);
        }}
        onConfirm={async () => {
          if (conflictTargetTask && conflictProposedStart && conflictProposedEnd) {
            setConflictDialogOpen(false);
            await commitScheduleChange(
              conflictTargetTask,
              conflictProposedStart,
              conflictProposedEnd
            );
          }
        }}
      />

      {/* Shared Task Creation / Editing Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
          void loadCalendarTasks();
          setBacklogRefreshKey((k) => k + 1);
        }}
        taskToEdit={selectedTask}
        defaultScheduledStartAt={modalDefaultStart}
        defaultScheduledEndAt={modalDefaultEnd}
      />
    </div>
  );
}

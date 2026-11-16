/**
 * Types and interfaces for the Calendar & Time-Blocking feature.
 */

import type { Task } from "@/features/tasks/types";

export type CalendarViewMode = "day" | "week" | "month";

export interface CalendarRange {
  start: Date;
  end: Date;
  isoStart: string;
  isoEnd: string;
}

export interface DragItem {
  type: "scheduled_task" | "backlog_task";
  task: Task;
  originStartMinutes?: number;
  durationMinutes: number;
}

export interface ConflictState {
  isOpen: boolean;
  targetTask: Task;
  proposedStart: string;
  proposedEnd: string;
  conflictingTasks: Task[];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Timezone and date arithmetic utilities for calendar rendering and time-blocking.
 *
 * All timestamps are handled in UTC externally and mapped to the target IANA timezone
 * using native Intl.DateTimeFormat APIs.
 */

/**
 * Returns user's local IANA timezone or fallback.
 */
export function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Common IANA timezones for selector.
 */
export const POPULAR_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

/**
 * Extract timezone-specific date parts (year, month 1-12, day, hour, minute, second).
 */
export function getZonedDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      partMap[p.type] = parseInt(p.value, 10);
    }
  }

  return {
    year: partMap.year ?? date.getUTCFullYear(),
    month: partMap.month ?? date.getUTCMonth() + 1,
    day: partMap.day ?? date.getUTCDate(),
    hour: (partMap.hour === 24 ? 0 : partMap.hour) ?? date.getUTCHours(),
    minute: partMap.minute ?? date.getUTCMinutes(),
    second: partMap.second ?? date.getUTCSeconds(),
  };
}

/**
 * Format a Date object into 'YYYY-MM-DD' representing that day in the given timezone.
 */
export function formatZonedDateKey(date: Date, timeZone: string): string {
  const parts = getZonedDateParts(date, timeZone);
  const y = parts.year.toString().padStart(4, "0");
  const m = parts.month.toString().padStart(2, "0");
  const d = parts.day.toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Create a UTC Date corresponding to a specific local year, month, day, hour, minute in timeZone.
 */
export function createUtcFromZonedParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  // Construct an approximate UTC timestamp
  const approximateUtc = Date.UTC(year, month - 1, day, hour, minute);
  const tempDate = new Date(approximateUtc);

  // Check what the zoned parts would be for this approximate UTC
  const zoned = getZonedDateParts(tempDate, timeZone);

  // Difference in minutes between desired and actual zoned time
  const targetMinuteOfDay = (year * 525600) + (month * 43800) + (day * 1440) + (hour * 60) + minute;
  const actualMinuteOfDay = (zoned.year * 525600) + (zoned.month * 43800) + (zoned.day * 1440) + (zoned.hour * 60) + zoned.minute;
  const diffMinutes = targetMinuteOfDay - actualMinuteOfDay;

  return new Date(approximateUtc + diffMinutes * 60 * 1000);
}

/**
 * Format hour label (e.g. "9 AM", "09:00").
 */
export function formatHourLabel(hour: number, is24Hour = false): string {
  if (is24Hour) {
    return `${hour.toString().padStart(2, "0")}:00`;
  }
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

/**
 * Format a time range string in the user's timezone (e.g., "10:00 AM – 11:30 AM").
 */
export function formatTimeRangeZoned(
  start: Date | string,
  end: Date | string,
  timeZone: string,
  is24Hour = false
): string {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;

  const startOpts: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: is24Hour ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: !is24Hour,
  };

  const endOpts: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: is24Hour ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: !is24Hour,
  };

  const startFmt = new Intl.DateTimeFormat("en-US", startOpts).format(startDate);
  const endFmt = new Intl.DateTimeFormat("en-US", endOpts).format(endDate);
  return `${startFmt} – ${endFmt}`;
}

/**
 * Return start of week (Sunday or Monday, default Sunday) in local calendar day.
 */
export function getStartOfWeek(date: Date, startOnMonday = false): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (startOnMonday ? (day === 0 ? -6 : 1) : 0);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Generate 7 days of the week starting from weekStart.
 */
export function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Get days for month grid (including previous/next month padding to make full 35 or 42 grid).
 */
export function getMonthGridDays(currentDate: Date): Date[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay(); // 0 is Sunday

  const days: Date[] = [];
  // Previous month padding
  for (let i = startDay - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Days in current month
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i));
  }

  // Next month padding
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

/**
 * Snap minutes to nearest step (e.g., 15 minutes).
 */
export function snapToMinutes(minutes: number, step = 15): number {
  return Math.round(minutes / step) * step;
}

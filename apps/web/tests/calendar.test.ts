/**
 * Unit and integration tests for calendar scheduling utilities, timezone arithmetic,
 * conflict checking, and date range computations.
 */

import {
  createUtcFromZonedParts,
  formatHourLabel,
  formatTimeRangeZoned,
  formatZonedDateKey,
  getMonthGridDays,
  getStartOfWeek,
  getWeekDays,
  getZonedDateParts,
  snapToMinutes,
} from "../src/features/calendar/utils/date-utils";
import { tasksService } from "../src/features/tasks/services/tasks-service";

export function runCalendarUnitTests() {
  // 1. Test 15-minute snapping
  if (snapToMinutes(7) !== 0 || snapToMinutes(8) !== 15 || snapToMinutes(23) !== 30) {
    throw new Error("snapToMinutes failed rounding checks");
  }

  // 2. Test hour formatting (12h and 24h)
  if (formatHourLabel(0, false) !== "12 AM" || formatHourLabel(13, false) !== "1 PM") {
    throw new Error("formatHourLabel 12h failed");
  }
  if (formatHourLabel(9, true) !== "09:00" || formatHourLabel(15, true) !== "15:00") {
    throw new Error("formatHourLabel 24h failed");
  }

  // 3. Test week calculation
  const testDate = new Date(2026, 10, 16); // Monday Nov 16, 2026
  const weekStart = getStartOfWeek(testDate, false); // Sunday Nov 15
  if (weekStart.getDay() !== 0) {
    throw new Error("getStartOfWeek Sunday failed");
  }
  const weekDays = getWeekDays(weekStart);
  if (weekDays.length !== 7 || weekDays[0].getDay() !== 0 || weekDays[6].getDay() !== 6) {
    throw new Error("getWeekDays failed");
  }

  // 4. Test month grid days padding
  const monthDays = getMonthGridDays(testDate);
  if (monthDays.length % 7 !== 0 || monthDays.length < 28) {
    throw new Error("getMonthGridDays failed to return complete rectangular week rows");
  }

  // 5. Test Timezone and Daylight Saving boundary arithmetic
  // New York (EDT -> EST transition occurred early November)
  const nyTz = "America/New_York";
  const dateNov1 = new Date(Date.UTC(2026, 10, 1, 16, 0, 0)); // Nov 1 16:00 UTC = 12:00 EDT (UTC-4)
  const nyParts = getZonedDateParts(dateNov1, nyTz);
  if (nyParts.hour !== 12 || nyParts.month !== 11 || nyParts.day !== 1) {
    throw new Error(`getZonedDateParts failed for EDT: got ${JSON.stringify(nyParts)}`);
  }

  // Roundtrip conversion: Zoned local time -> UTC -> Zoned local time
  const targetHour = 14;
  const targetMinute = 30;
  const convertedUtc = createUtcFromZonedParts(2026, 11, 16, targetHour, targetMinute, nyTz);
  const roundtripParts = getZonedDateParts(convertedUtc, nyTz);
  if (roundtripParts.hour !== targetHour || roundtripParts.minute !== targetMinute) {
    throw new Error(
      `Roundtrip createUtcFromZonedParts failed for ${nyTz}: expected ${targetHour}:${targetMinute}, got ${roundtripParts.hour}:${roundtripParts.minute}`
    );
  }

  // Tokyo (Asia/Tokyo, UTC+9, no DST)
  const tokyoTz = "Asia/Tokyo";
  const tokyoParts = getZonedDateParts(dateNov1, tokyoTz);
  if (tokyoParts.day !== 2 || tokyoParts.hour !== 1) { // 16:00 UTC + 9h = 01:00 next day
    throw new Error(`Tokyo timezone conversion failed: got ${JSON.stringify(tokyoParts)}`);
  }

  // 6. Test formatZonedDateKey
  const dateKey = formatZonedDateKey(dateNov1, "UTC");
  if (dateKey !== "2026-11-01") {
    throw new Error(`formatZonedDateKey failed: got ${dateKey}`);
  }

  // 7. Test formatTimeRangeZoned
  const rangeStr = formatTimeRangeZoned(
    "2026-11-16T14:00:00Z",
    "2026-11-16T15:30:00Z",
    "UTC",
    true
  );
  if (!rangeStr.includes("14:00") || !rangeStr.includes("15:30")) {
    throw new Error(`formatTimeRangeZoned 24h failed: got ${rangeStr}`);
  }

  // 8. Test tasksService.checkConflicts API method exists
  if (typeof tasksService.checkConflicts !== "function") {
    throw new Error("tasksService.checkConflicts is not a function");
  }

  return true;
}

// Execute tests at compilation/runtime check
runCalendarUnitTests();

"use client";

import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CalendarContainer } from "@/features/calendar/components/calendar-container";

export default function CalendarPage() {
  return (
    <AppShell>
      <CalendarContainer />
    </AppShell>
  );
}

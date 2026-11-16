# Calendar & Time Blocking Architecture

## 1. Overview & System Design

NextUP provides an integrated, responsive calendar and time-blocking system built on top of the modular Django REST Framework backend and Next.js 16 frontend.

Tasks serve as first-class calendar scheduling blocks without requiring synthetic event models or relational duplication.

## 2. Scheduling Domain Model

The calendar leverages native fields on the `Task` entity:
- `scheduled_start_at`: `DateTimeField(null=True, blank=True, db_index=True)` — Timezone-aware UTC start timestamp.
- `scheduled_end_at`: `DateTimeField(null=True, blank=True, db_index=True)` — Timezone-aware UTC end timestamp.
- `estimated_minutes`: `PositiveIntegerField(null=True, blank=True)` — User's time estimate in minutes, used for default scheduling duration.
- `due_at`: `DateTimeField(null=True, blank=True, db_index=True)` — Deadline. Distinct from scheduled time blocks.

### Constraints & Invariants
1. `task_scheduled_end_after_start`: Database check constraint requiring `scheduled_end_at > scheduled_start_at` whenever both are populated.
2. Composite index `task_owner_sched_idx` on `(owner, scheduled_start_at, scheduled_end_at)` ensures $O(\log N)$ range lookups and overlap resolution.

## 3. Half-Open Interval Overlap Semantics

For a requested calendar date range $[R_{\text{start}}, R_{\text{end}})$ and a scheduled task $[T_{\text{start}}, T_{\text{end}})$, an overlap exists if and only if:

$$T_{\text{start}} < R_{\text{end}} \quad \text{AND} \quad T_{\text{end}} > R_{\text{start}}$$

This half-open convention guarantees:
- Back-to-back blocks (e.g. 10:00–11:00 and 11:00–12:00) do NOT conflict at the boundary.
- Tasks spanning across midnight or multiple days correctly intersect every encompassed daily timeline.

## 4. Conflict Warning Engine

- Endpoint: `GET /api/v1/tasks/conflicts/?start_at=...&end_at=...&exclude_task_id=...`
- Detects existing scheduled tasks for the authenticated owner intersecting the proposed time window.
- Excludes the task being actively moved or resized.
- Conflicts are presented as non-blocking warnings in the UI (`ConflictDialog`), allowing users to intentionally schedule concurrent commitments (e.g., attending a sync call while pair-programming).

## 5. Timezone Management

1. **Storage**: All database timestamps are persisted in UTC (`TIME_ZONE = "UTC"`, `USE_TZ = True`).
2. **Display**: Client translates UTC timestamps to the selected IANA timezone (defaulting to `Intl.DateTimeFormat().resolvedOptions().timeZone`) without fixed UTC offset assumptions.
3. **Daylight Saving Time (DST)**: Native `Intl` formats dynamically apply historical and future offset transitions (such as EDT $\to$ EST).
4. **Time Formats**: Interactive toggle allows switching between 12-hour (AM/PM) and 24-hour display modes.

## 6. Frontend Component Architecture

```
apps/web/src/
├── app/calendar/page.tsx               # Route entry point wrapped in AppShell
└── features/calendar/
    ├── components/
    │   ├── calendar-container.tsx      # Main state coordinator, drag-and-drop, optimistic updates
    │   ├── calendar-header.tsx         # Range navigation, view switcher, timezone selector, backlog toggle
    │   ├── week-view.tsx               # 7-day hourly grid (default view), current-time indicator
    │   ├── day-view.tsx                # Single-day timeline with detailed slots
    │   ├── month-view.tsx              # 35/42-cell traditional month grid with overflow counters
    │   ├── time-block.tsx              # Draggable & resizable task card with project colors & complete toggle
    │   ├── unscheduled-panel.tsx       # Paginated, searchable backlog of unscheduled items
    │   └── conflict-dialog.tsx         # Accessible overlap warning confirmation dialog
    ├── types/
    │   └── index.ts                    # Calendar contracts and drag item definitions
    └── utils/
        └── date-utils.ts               # Timezone arithmetic, snapping, and grid calculations
```

## 7. Optimistic Persistence & Rollback

- Dragging, resizing, or scheduling an item immediately reflects in client state.
- In-flight background PATCH request updates backend Postgres record.
- If the server rejects the update (e.g., network failure, validation failure), state automatically rolls back to the previous snapshot with a clear toast notification.

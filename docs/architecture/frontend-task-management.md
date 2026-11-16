# Frontend Task & Project Management Architecture

## 1. Overview

NextUP Task 5 introduces the full frontend task and project management client application within `apps/web/`. Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS**, it interfaces seamlessly with the Django REST Framework backend through the Next.js same-origin API rewrite proxy (`/api/:path*` -> Django API server).

---

## 2. Structure & Feature Slicing

The frontend follows feature-driven separation with central shared layouts:

```text
apps/web/src/
├── app/
│   ├── dashboard/page.tsx      # Main executive dashboard with metrics, today's tasks & recent projects
│   ├── tasks/page.tsx          # Full inbox & task list with search, status/priority filters & pagination
│   ├── today/page.tsx          # Focus view filtered by tasks due today
│   ├── upcoming/page.tsx       # Forward-looking view filtered by tasks due tomorrow and beyond
│   ├── projects/
│   │   ├── page.tsx            # Project cards list, status switcher (active/archived), and quick edit
│   │   └── [id]/page.tsx       # Project detail board with progress bar and scoped task tree
│   ├── settings/page.tsx       # Owner profile and workspace settings
│   └── login/page.tsx          # Session authentication login screen
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx       # Reusable layout shell with sidebar, header & modal overlays
│   │   ├── sidebar.tsx         # Responsive sidebar with navigation and project quick-links
│   │   └── header.tsx          # Sticky header with greeting, search bar, and "New Task" trigger
│   └── ui/
│       └── icons.tsx           # Scalable SVG icons for navigation, status, and priorities
├── features/
│   ├── projects/
│   │   ├── components/project-modal.tsx  # Accessible modal for creating and updating projects
│   │   ├── hooks/use-projects.tsx        # React Context & Hook managing project state
│   │   ├── services/projects-service.ts  # Typed API client for /api/v1/projects/
│   │   └── types/index.ts                # TypeScript interfaces matching backend models
│   └── tasks/
│       ├── components/
│       │   ├── task-item.tsx             # Interactive task item with completion toggle & subtask tree
│       │   └── task-modal.tsx            # Modal for creating, editing, and assigning tasks/subtasks
│       ├── hooks/use-tasks.tsx           # React Context & Hook managing tasks state & filters
│       ├── services/tasks-service.ts     # Typed API client for /api/v1/tasks/
│       └── types/index.ts                # TypeScript interfaces matching backend task models
└── lib/
    └── api-client.ts           # CSRF-aware fetch wrapper with session cookie support
```

---

## 3. UI/UX Design System & Dashboard Composition

The interface adheres to the modern, polished design system specified in the reference mockups:
- **Productivity Summary Cards**: Total tasks, completed tasks, tasks due today, and 7-day upcoming tasks.
- **Radial Task Progress Indicator**: SVG-based dynamic progress gauge reflecting actual completion percentage.
- **Visual Priority Indicators**: Color-coded badges for `Urgent` (Red), `High` (Amber), `Medium` (Blue), and `Low` (Gray).
- **Subtask Hierarchy**: Expandable/collapsible nested subtask views under each parent task, displaying subtask counts and cascaded completion states.
- **Quick Actions**: Prominent shortcut triggers for `New Task` and `New Project`.

---

## 4. State Management & API Resilience

- **Session Expiration**: Automatic 401 interception in `apiClient` redirecting expired sessions to `/login`.
- **CSRF Token Attachment**: Automatically extracts the `csrftoken` cookie and adds the `X-CSRFToken` header to all mutating HTTP methods (`POST`, `PATCH`, `DELETE`).
- **Bounded Fetching**: Main views request bounded pages (`page_size=20` or filtered queries) rather than unbounded task collections.
- **Optimistic UI Updates**: State updates occur reactively across Context providers upon successful API resolution.

---

## 5. Accessibility & Responsiveness

- **Keyboard & Touch Ready**: Mobile navigation uses a sliding drawer triggered via accessible hamburger button.
- **Dialogs & Modals**: Implements `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` semantics.
- **Destructive Confirmations**: Explicit browser confirmation dialogs before deleting tasks with subtasks or projects with associated tasks.

# Task & Project Management Architecture

## 1. Overview

NextUP provides a single-user personal task and execution planning platform. The backend is designed as a modular monolith within Django REST Framework, separating business logic into distinct domain modules (`projects` and `tasks`) under `apps/api/modules/`.

While optimized today for a single authenticated owner, the data models, service interfaces, database constraints, and REST controllers are designed for multi-tenancy, calendar integration, recurring tasks, and AI scheduling.

```
apps/api/modules/
├── projects/
│   ├── models.py
│   ├── serializers/
│   │   ├── __init__.py
│   │   └── projects.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── projects.py
│   ├── selectors/
│   │   ├── __init__.py
│   │   └── projects.py
│   ├── views/
│   │   ├── __init__.py
│   │   └── projects.py
│   ├── urls.py
│   └── migrations/
│       └── 0001_initial.py
└── tasks/
    ├── models.py
    ├── serializers/
    │   ├── __init__.py
    │   └── tasks.py
    ├── services/
    │   ├── __init__.py
    │   └── tasks.py
    ├── selectors/
    │   ├── __init__.py
    │   └── tasks.py
    ├── views/
    │   ├── __init__.py
    │   └── tasks.py
    ├── urls.py
    └── migrations/
        └── 0001_initial.py
```

---

## 2. Domain Models & Relational Invariants

### 2.1 Project Entity (`projects_project`)

Represents an organizing workspace or bucket for tasks.

- `id`: UUID (v4) Primary Key.
- `owner`: Foreign key to `accounts_user` with `on_delete=models.CASCADE`.
- `name`: Non-blank string (up to 255 chars).
- `description`: Optional text.
- `color`: Optional hex color string (`#RGB` or `#RRGGBB`).
- `status`: `active` or `archived`.
- `created_at` / `updated_at`: Audit timestamps.

### 2.2 Task Entity (`tasks_task`)

Represents a unit of work or action item. Supports recursive parent/child subtask trees.

- `id`: UUID (v4) Primary Key.
- `owner`: Foreign key to `accounts_user` with `on_delete=models.CASCADE`.
- `project`: Optional foreign key to `projects_project` with `on_delete=models.SET_NULL`.
- `parent_task`: Optional recursive self-reference with `on_delete=models.CASCADE`.
- `title`: Non-blank string (up to 255 chars).
- `description`: Optional text.
- `status`: Enum (`todo`, `in_progress`, `completed`, `cancelled`).
- `priority`: Enum (`low`, `medium`, `high`, `urgent`).
- `due_at`: Optional timezone-aware deadline.
- `scheduled_start_at`: Optional scheduled start timestamp.
- `scheduled_end_at`: Optional scheduled end timestamp. Must be strictly greater than `scheduled_start_at`.
- `estimated_minutes`: Optional positive integer.
- `completed_at`: Optional completion timestamp, synchronized with `status == 'completed'`.
- `created_at` / `updated_at`: Audit timestamps.

---

## 3. Business Logic & Deletion Semantics

### 3.1 Project Deletion
- Deleting a project does **not** destroy the associated tasks.
- The `project` foreign key is configured with `on_delete=models.SET_NULL`.
- Tasks formerly associated with that project remain preserved in the owner's task inbox (`project=None`).

### 3.2 Parent Task Deletion
- Deleting a parent task **cascades** to all its descendant subtasks (`on_delete=models.CASCADE`).
- This guarantees tree consistency and avoids dangling subtask fragments.

### 3.3 Relationship Validation
- **Cross-Owner Isolation**: Tasks cannot be linked to projects or parent tasks belonging to a different user.
- **Cycle Prevention**: Circular task parent references (e.g. A → B → C → A) are detected and rejected in service logic and serializers.
- **Self-Parenting**: Tasks cannot set `parent_task` to their own ID.
- **Timing Invariants**: `scheduled_end_at` must be strictly later than `scheduled_start_at`.
- **Completion Timestamps**: Marking a task `completed` automatically populates `completed_at`; reopening or resetting status automatically clears `completed_at`.

---

## 4. Query & Search Optimizations

The database schema includes composite indexes tailored for common query patterns:
- `(owner, status)`
- `(owner, priority)`
- `(owner, due_at)`
- `(owner, project)`
- `(owner, parent_task)`
- `(owner, status, due_at)`
- `(owner, -created_at)`

Text searches on `title` and `description` utilize case-insensitive substring queries (`__icontains`), providing full support for the current scale with a path toward PostgreSQL full-text search (`tsvector`) in future phases.

# Architecture Decision Record: Task & Project Models and Relational Architecture

- **Status**: Accepted
- **Date**: 2026-11-16
- **Context**: Milestone Task 4 requires building the core data models and REST endpoints for Projects, Tasks, and Subtasks within the NextUP Django modular monolith.

---

## 1. Decision

1. **Modular Monolith Layout**: Created two clean domain apps under `apps/api/modules/`: `projects` and `tasks`. Each app adopts the Service/Selector pattern (`services/`, `selectors/`, `views/`, `serializers/`, `models.py`, `urls.py`).
2. **Owner-Scoped Data Model**: Both `Project` and `Task` use UUIDv4 primary keys and enforce foreign keys to the custom `accounts.User` model (`on_delete=models.CASCADE`).
3. **Deletion Semantics**:
   - `Task.project` uses `on_delete=models.SET_NULL`. Deleting a project moves its child tasks to the user's unassigned backlog rather than destroying tasks.
   - `Task.parent_task` uses `on_delete=models.CASCADE`. Deleting a parent task removes its descendant subtasks to maintain tree consistency.
4. **Relational Invariant Enforcement**:
   - Tasks cannot reference projects or parent tasks belonging to another user.
   - Cycle detection is performed recursively upon assignment of `parent_task`.
   - `scheduled_end_at` must be strictly later than `scheduled_start_at`.
   - Marking a task completed automatically manages `completed_at` timestamp.
5. **REST API Design**:
   - Endpoints are versioned under `/api/v1/projects/` and `/api/v1/tasks/`.
   - All endpoints require authentication and `IsOwner` verification.
   - Standard pagination (`PageNumberPagination` with max 100) and query parameters for filtering, date ranges, and keyword search.

---

## 2. Consequences

### Positive
- Strict isolation of owner data prevents cross-tenant data leaks.
- Zero manual table manipulation in Supabase; all schema changes are codified and tested via Django migrations.
- Extensible schema ready for calendar blocks, recurring tasks, and AI scheduling.

### Trade-offs
- Subtask trees are currently validated in Python services and model `clean()` rather than PostgreSQL recursive constraints. This is optimal for low nesting depth (< 5 levels typical for personal task planning) and standard ORM portability.

# Tasks REST API Specification

Version: `v1`  
Base URL: `/api/v1/tasks/`  
Authentication: Session Cookie (`sessionid`) + CSRF Token (`X-CSRFToken`) for mutating methods.  
Authorization: Owner only (`IsOwner` permission class).

---

## Endpoints

### 1. List Tasks

`GET /api/v1/tasks/`

#### Query Parameters:
- `status` (optional): `todo`, `in_progress`, `completed`, `cancelled`
- `priority` (optional): `low`, `medium`, `high`, `urgent`
- `project` (optional): Project UUID, or `null` for tasks without a project.
- `parent_task` (optional): Parent Task UUID, or `null` for top-level tasks.
- `include_subtasks` (optional): `true` or `false`. If `false`, filters to top-level tasks only.
- `due_after` (optional): ISO 8601 datetime string.
- `due_before` (optional): ISO 8601 datetime string.
- `search` (optional): Case-insensitive match against task `title` or `description`.
- `ordering` (optional): `created_at`, `-created_at`, `due_at`, `-due_at`, `priority`, `-priority`, `status`, `-status`, `title`, `-title`.
- `page` (optional): Page number (defaults to 1).
- `page_size` (optional): Items per page (defaults to 20, max 100).

#### Response: `200 OK`
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "e91245e8-1425-4c07-9ad8-fd136e0ab52e",
      "title": "Build tasks API",
      "description": "Full REST endpoints and tests",
      "status": "in_progress",
      "priority": "urgent",
      "project": {
        "id": "c1f7a28e-5cb2-4a0b-a6fe-4d7a1e04135e",
        "name": "Backend Development",
        "description": "Tasks API implementation",
        "color": "#4F46E5",
        "status": "active",
        "created_at": "2026-11-16T12:00:00Z",
        "updated_at": "2026-11-16T12:00:00Z"
      },
      "parent_task": null,
      "subtasks_count": 2,
      "due_at": "2026-11-20T18:00:00Z",
      "scheduled_start_at": "2026-11-16T09:00:00Z",
      "scheduled_end_at": "2026-11-16T11:00:00Z",
      "estimated_minutes": 120,
      "completed_at": null,
      "created_at": "2026-11-16T12:00:00Z",
      "updated_at": "2026-11-16T12:15:00Z"
    }
  ]
}
```

---

### 2. Create Task

`POST /api/v1/tasks/`

#### Request Body:
```json
{
  "title": "Subtask 1: Write migrations",
  "description": "Create projects and tasks initial tables",
  "priority": "high",
  "status": "todo",
  "project_id": "c1f7a28e-5cb2-4a0b-a6fe-4d7a1e04135e",
  "parent_task_id": "e91245e8-1425-4c07-9ad8-fd136e0ab52e",
  "due_at": "2026-11-18T18:00:00Z",
  "estimated_minutes": 30
}
```

#### Response: `201 Created`
```json
{
  "id": "b2f654aa-1122-48ce-8302-39c299f242aa",
  "title": "Subtask 1: Write migrations",
  "description": "Create projects and tasks initial tables",
  "status": "todo",
  "priority": "high",
  "project": {
    "id": "c1f7a28e-5cb2-4a0b-a6fe-4d7a1e04135e",
    "name": "Backend Development",
    "description": "Tasks API implementation",
    "color": "#4F46E5",
    "status": "active",
    "created_at": "2026-11-16T12:00:00Z",
    "updated_at": "2026-11-16T12:00:00Z"
  },
  "parent_task": {
    "id": "e91245e8-1425-4c07-9ad8-fd136e0ab52e",
    "title": "Build tasks API",
    "status": "in_progress",
    "priority": "urgent"
  },
  "subtasks_count": 0,
  "due_at": "2026-11-18T18:00:00Z",
  "scheduled_start_at": null,
  "scheduled_end_at": null,
  "estimated_minutes": 30,
  "completed_at": null,
  "created_at": "2026-11-16T12:30:00Z",
  "updated_at": "2026-11-16T12:30:00Z"
}
```

---

### 3. Retrieve Task

`GET /api/v1/tasks/{id}/`

#### Response: `200 OK`
```json
{
  "id": "b2f654aa-1122-48ce-8302-39c299f242aa",
  "title": "Subtask 1: Write migrations",
  "description": "Create projects and tasks initial tables",
  "status": "todo",
  "priority": "high",
  "project": { ... },
  "parent_task": { ... },
  "subtasks_count": 0,
  "due_at": "2026-11-18T18:00:00Z",
  "scheduled_start_at": null,
  "scheduled_end_at": null,
  "estimated_minutes": 30,
  "completed_at": null,
  "created_at": "2026-11-16T12:30:00Z",
  "updated_at": "2026-11-16T12:30:00Z"
}
```

---

### 4. Update Task

`PATCH /api/v1/tasks/{id}/`

#### Request Body:
```json
{
  "priority": "urgent",
  "status": "in_progress"
}
```

#### Response: `200 OK`
```json
{
  "id": "b2f654aa-1122-48ce-8302-39c299f242aa",
  "title": "Subtask 1: Write migrations",
  "description": "Create projects and tasks initial tables",
  "status": "in_progress",
  "priority": "urgent",
  "project": { ... },
  "parent_task": { ... },
  "subtasks_count": 0,
  "due_at": "2026-11-18T18:00:00Z",
  "scheduled_start_at": null,
  "scheduled_end_at": null,
  "estimated_minutes": 30,
  "completed_at": null,
  "created_at": "2026-11-16T12:30:00Z",
  "updated_at": "2026-11-16T12:45:00Z"
}
```

---

### 5. Mark Task Complete

`POST /api/v1/tasks/{id}/complete/`

#### Request Body: None required (`{}`)

#### Response: `200 OK`
```json
{
  "id": "b2f654aa-1122-48ce-8302-39c299f242aa",
  "title": "Subtask 1: Write migrations",
  "status": "completed",
  "completed_at": "2026-11-16T12:50:00Z",
  ...
}
```

---

### 6. Reopen Task

`POST /api/v1/tasks/{id}/reopen/`

#### Request Body: None required (`{}`)

#### Response: `200 OK`
```json
{
  "id": "b2f654aa-1122-48ce-8302-39c299f242aa",
  "title": "Subtask 1: Write migrations",
  "status": "todo",
  "completed_at": null,
  ...
}
```

---

### 7. Delete Task

`DELETE /api/v1/tasks/{id}/`

#### Response: `204 No Content`
- Cascades to delete all child subtasks of this task.

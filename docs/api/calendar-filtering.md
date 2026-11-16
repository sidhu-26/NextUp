# Calendar Date-Range & Conflict API Contracts

## Endpoints

### 1. List Tasks with Calendar Range & Scheduling Filters

```http
GET /api/v1/tasks/
```

#### Query Parameters

| Parameter | Type | Required | Description |
|:---|:---|:---|:---|
| `scheduled_from` | ISO 8601 string | Optional | Start of requested date range (inclusive boundary). E.g. `2026-11-15T00:00:00Z` |
| `scheduled_to` | ISO 8601 string | Optional | End of requested date range (exclusive boundary). E.g. `2026-11-22T00:00:00Z` |
| `is_scheduled` | Boolean (`true`/`false`) | Optional | When `false`, returns unscheduled tasks (backlog). When `true`, returns only scheduled tasks. |
| `status` | String | Optional | Filter by status (`todo`, `in_progress`, `completed`, `cancelled`). |
| `priority` | String | Optional | Filter by priority (`low`, `medium`, `high`, `urgent`). |
| `project` | UUID | Optional | Filter by project UUID. |
| `page` | Integer | Optional | Page number (default: 1). |
| `page_size` | Integer | Optional | Items per page (default: 20, max: 100). |

#### Validation Rules
- `scheduled_to` must be strictly later than `scheduled_from`.
- Date range limit: `scheduled_to - scheduled_from` cannot exceed 93 days.
- Overlap query expression:
  ```python
  Task.objects.filter(
      scheduled_start_at__lt=scheduled_to,
      scheduled_end_at__gt=scheduled_from,
  )
  ```

#### Response Example (`200 OK`)

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "e7b0a880-9289-401d-b570-3d7be34f19b2",
      "title": "Database Indexing Review",
      "description": "Analyze Supabase pooler query plans",
      "status": "todo",
      "priority": "high",
      "project": {
        "id": "1d867c2a-b732-4467-9c98-15a01bc1e3ab",
        "name": "Backend Infrastructure",
        "color": "#6366F1",
        "status": "active"
      },
      "parent_task": null,
      "subtasks_count": 0,
      "due_at": null,
      "scheduled_start_at": "2026-11-16T10:00:00Z",
      "scheduled_end_at": "2026-11-16T11:00:00Z",
      "estimated_minutes": 60,
      "completed_at": null,
      "created_at": "2026-11-16T09:00:00Z",
      "updated_at": "2026-11-16T09:15:00Z"
    }
  ]
}
```

---

### 2. Check Scheduling Conflicts

```http
GET /api/v1/tasks/conflicts/
```

#### Query Parameters

| Parameter | Type | Required | Description |
|:---|:---|:---|:---|
| `start_at` | ISO 8601 string | Yes | Start timestamp of candidate time block. |
| `end_at` | ISO 8601 string | Yes | End timestamp of candidate time block. |
| `exclude_task_id` | UUID | Optional | ID of task being rescheduled (excluded from conflict detection). |

#### Response Example (`200 OK`)

```json
{
  "has_conflicts": true,
  "conflicts_count": 1,
  "conflicts": [
    {
      "id": "e7b0a880-9289-401d-b570-3d7be34f19b2",
      "title": "Database Indexing Review",
      "scheduled_start_at": "2026-11-16T10:00:00Z",
      "scheduled_end_at": "2026-11-16T11:00:00Z",
      "project": {
        "name": "Backend Infrastructure",
        "color": "#6366F1"
      }
    }
  ]
}
```

---

### 3. Schedule, Reschedule, or Unschedule Task

```http
PATCH /api/v1/tasks/{id}/
```

#### Request Payload to Schedule or Move:

```json
{
  "scheduled_start_at": "2026-11-16T13:00:00Z",
  "scheduled_end_at": "2026-11-16T14:15:00Z"
}
```

#### Request Payload to Unschedule (remove from calendar to backlog):

```json
{
  "scheduled_start_at": null,
  "scheduled_end_at": null
}
```

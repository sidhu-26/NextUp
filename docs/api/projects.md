# Projects REST API Specification

Version: `v1`  
Base URL: `/api/v1/projects/`  
Authentication: Session Cookie (`sessionid`) + CSRF Token (`X-CSRFToken`) for mutating methods.  
Authorization: Owner only (`IsOwner` permission class).

---

## Endpoints

### 1. List Projects

`GET /api/v1/projects/`

#### Query Parameters:
- `status` (optional): Filter by project status (`active` or `archived`).

#### Response: `200 OK`
```json
[
  {
    "id": "c1f7a28e-5cb2-4a0b-a6fe-4d7a1e04135e",
    "name": "Backend Development",
    "description": "Tasks API implementation",
    "color": "#4F46E5",
    "status": "active",
    "created_at": "2026-11-16T12:00:00Z",
    "updated_at": "2026-11-16T12:00:00Z"
  }
]
```

---

### 2. Create Project

`POST /api/v1/projects/`

#### Request Body:
```json
{
  "name": "Personal Goals",
  "description": "Annual tracking",
  "color": "#10B981",
  "status": "active"
}
```

#### Response: `201 Created`
```json
{
  "id": "c1f7a28e-5cb2-4a0b-a6fe-4d7a1e04135e",
  "name": "Personal Goals",
  "description": "Annual tracking",
  "color": "#10B981",
  "status": "active",
  "created_at": "2026-11-16T12:00:00Z",
  "updated_at": "2026-11-16T12:00:00Z"
}
```

---

### 3. Retrieve Project

`GET /api/v1/projects/{id}/`

#### Response: `200 OK`
```json
{
  "id": "c1f7a28e-5cb2-4a0b-a6fe-4d7a1e04135e",
  "name": "Personal Goals",
  "description": "Annual tracking",
  "color": "#10B981",
  "status": "active",
  "created_at": "2026-11-16T12:00:00Z",
  "updated_at": "2026-11-16T12:00:00Z"
}
```

---

### 4. Update Project

`PATCH /api/v1/projects/{id}/`

#### Request Body:
```json
{
  "name": "Updated Goals",
  "status": "archived"
}
```

#### Response: `200 OK`
```json
{
  "id": "c1f7a28e-5cb2-4a0b-a6fe-4d7a1e04135e",
  "name": "Updated Goals",
  "description": "Annual tracking",
  "color": "#10B981",
  "status": "archived",
  "created_at": "2026-11-16T12:00:00Z",
  "updated_at": "2026-11-16T12:30:00Z"
}
```

---

### 5. Delete Project

`DELETE /api/v1/projects/{id}/`

#### Response: `204 No Content`
- Tasks under this project remain intact with `project: null`.

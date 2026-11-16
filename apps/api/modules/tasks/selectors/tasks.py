"""Selectors for NextUP tasks module."""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from django.db.models import Q, QuerySet

from modules.tasks.models import Task

if TYPE_CHECKING:
    from modules.accounts.models import User


def get_tasks_for_owner(
    owner: "User",
    *,
    status: str | None = None,
    priority: str | None = None,
    project_id: UUID | str | None = None,
    parent_task_id: UUID | str | None = None,
    include_subtasks: bool | None = None,
    due_after: datetime | None = None,
    due_before: datetime | None = None,
    search: str | None = None,
    ordering: str | None = None,
) -> QuerySet[Task]:
    """Retrieve owner-scoped tasks with filtering, search, and ordering."""
    queryset = Task.objects.filter(owner=owner).select_related("project", "parent_task")

    if status:
        queryset = queryset.filter(status=status)

    if priority:
        queryset = queryset.filter(priority=priority)

    if project_id is not None:
        if str(project_id).lower() in ("none", "null"):
            queryset = queryset.filter(project__isnull=True)
        else:
            queryset = queryset.filter(project_id=project_id)

    if parent_task_id is not None:
        if str(parent_task_id).lower() in ("none", "null"):
            queryset = queryset.filter(parent_task__isnull=True)
        else:
            queryset = queryset.filter(parent_task_id=parent_task_id)
    elif include_subtasks is False:
        # If user explicitly specifies include_subtasks=false, only top-level tasks
        queryset = queryset.filter(parent_task__isnull=True)

    if due_after:
        queryset = queryset.filter(due_at__gte=due_after)

    if due_before:
        queryset = queryset.filter(due_at__lte=due_before)

    if search:
        search_query = search.strip()
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query)
                | Q(description__icontains=search_query)
            )

    # Valid ordering fields for security and stability
    valid_orderings = {
        "created_at": "created_at",
        "-created_at": "-created_at",
        "due_at": "due_at",
        "-due_at": "-due_at",
        "priority": "priority",
        "-priority": "-priority",
        "status": "status",
        "-status": "-status",
        "title": "title",
        "-title": "-title",
    }

    if ordering and ordering in valid_orderings:
        queryset = queryset.order_by(valid_orderings[ordering], "-created_at")
    else:
        queryset = queryset.order_by("-created_at")

    return queryset


def get_task_by_id_for_owner(owner: "User", task_id: UUID | str) -> Task | None:
    """Retrieve a single task by ID for a given owner, or None if not found."""
    return (
        Task.objects.filter(owner=owner, id=task_id)
        .select_related("project", "parent_task")
        .first()
    )

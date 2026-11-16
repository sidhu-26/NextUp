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
    scheduled_from: datetime | None = None,
    scheduled_to: datetime | None = None,
    is_scheduled: bool | None = None,
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

    # Scheduled intervals overlapping [scheduled_from, scheduled_to)
    # Task interval (scheduled_start_at, scheduled_end_at) overlaps with (scheduled_from, scheduled_to)
    # when: scheduled_start_at < scheduled_to AND scheduled_end_at > scheduled_from
    if scheduled_from and scheduled_to:
        queryset = queryset.filter(
            scheduled_start_at__lt=scheduled_to,
            scheduled_end_at__gt=scheduled_from,
        )
    elif scheduled_from:
        queryset = queryset.filter(scheduled_end_at__gt=scheduled_from)
    elif scheduled_to:
        queryset = queryset.filter(scheduled_start_at__lt=scheduled_to)

    if is_scheduled is True:
        queryset = queryset.filter(
            scheduled_start_at__isnull=False,
            scheduled_end_at__isnull=False,
        )
    elif is_scheduled is False:
        queryset = queryset.filter(
            Q(scheduled_start_at__isnull=True) | Q(scheduled_end_at__isnull=True)
        )

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
        "scheduled_start_at": "scheduled_start_at",
        "-scheduled_start_at": "-scheduled_start_at",
        "scheduled_end_at": "scheduled_end_at",
        "-scheduled_end_at": "-scheduled_end_at",
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


def check_task_conflicts_for_owner(
    owner: "User",
    start_time: datetime,
    end_time: datetime,
    exclude_task_id: UUID | str | None = None,
) -> QuerySet[Task]:
    """Find scheduled tasks owned by user that overlap with [start_time, end_time).

    Two intervals (A, B) and (C, D) overlap if A < D and B > C.
    Excludes the task being edited (if exclude_task_id is given).
    Excludes cancelled tasks.
    """
    qs = Task.objects.filter(
        owner=owner,
        scheduled_start_at__isnull=False,
        scheduled_end_at__isnull=False,
        scheduled_start_at__lt=end_time,
        scheduled_end_at__gt=start_time,
    ).exclude(status="cancelled")

    if exclude_task_id:
        qs = qs.exclude(id=exclude_task_id)

    return qs.select_related("project").order_by("scheduled_start_at")

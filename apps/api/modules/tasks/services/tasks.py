"""Services for NextUP tasks module."""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from modules.projects.models import Project
from modules.tasks.models import Task, TaskPriority, TaskStatus

if TYPE_CHECKING:
    from modules.accounts.models import User


def _validate_ownership(
    owner: "User",
    project: Project | None = None,
    parent_task: Task | None = None,
) -> None:
    """Ensure project and parent task belong to the owner."""
    if project and project.owner_id != owner.id:
        raise ValidationError(
            {"project": "Task cannot reference another owner's project."}
        )
    if parent_task and parent_task.owner_id != owner.id:
        raise ValidationError(
            {"parent_task": "A subtask cannot reference another owner's task."}
        )


def _validate_parent_hierarchy(task_id: UUID | None, parent_task: Task | None) -> None:
    """Ensure parent task is not self and contains no cycles."""
    if not parent_task or not task_id:
        return
    if task_id == parent_task.id:
        raise ValidationError({"parent_task": "A task cannot be its own parent."})

    visited = {task_id}
    curr = parent_task
    while curr is not None:
        if curr.id in visited:
            raise ValidationError(
                {"parent_task": "Parent task relationships cannot contain cycles."}
            )
        visited.add(curr.id)
        curr = curr.parent_task


@transaction.atomic
def create_task(
    *,
    owner: "User",
    title: str,
    description: str = "",
    status: str = TaskStatus.TODO,
    priority: str = TaskPriority.MEDIUM,
    project: Project | None = None,
    parent_task: Task | None = None,
    due_at: datetime | None = None,
    scheduled_start_at: datetime | None = None,
    scheduled_end_at: datetime | None = None,
    estimated_minutes: int | None = None,
) -> Task:
    """Create a new task instance for an owner."""
    _validate_ownership(owner=owner, project=project, parent_task=parent_task)

    completed_at = timezone.now() if status == TaskStatus.COMPLETED else None

    task = Task(
        owner=owner,
        project=project,
        parent_task=parent_task,
        title=title,
        description=description,
        status=status,
        priority=priority,
        due_at=due_at,
        scheduled_start_at=scheduled_start_at,
        scheduled_end_at=scheduled_end_at,
        estimated_minutes=estimated_minutes,
        completed_at=completed_at,
    )
    task.save()
    return task


@transaction.atomic
def update_task(
    *,
    task: Task,
    **fields,
) -> Task:
    """Update an existing task with validated fields."""
    allowed_fields = {
        "title",
        "description",
        "status",
        "priority",
        "project",
        "parent_task",
        "due_at",
        "scheduled_start_at",
        "scheduled_end_at",
        "estimated_minutes",
        "completed_at",
    }

    project = fields.get("project", task.project)
    parent_task = fields.get("parent_task", task.parent_task)

    _validate_ownership(owner=task.owner, project=project, parent_task=parent_task)
    if "parent_task" in fields:
        _validate_parent_hierarchy(task.id, parent_task)

    # Handle completion timestamp consistency if status is being updated
    if "status" in fields:
        new_status = fields["status"]
        if new_status == TaskStatus.COMPLETED and not fields.get("completed_at"):
            fields["completed_at"] = task.completed_at or timezone.now()
        elif new_status != TaskStatus.COMPLETED and "completed_at" not in fields:
            fields["completed_at"] = None

    for field, value in fields.items():
        if field in allowed_fields:
            setattr(task, field, value)

    task.save()
    return task


@transaction.atomic
def complete_task(*, task: Task) -> Task:
    """Mark task as completed and record timestamp."""
    task.status = TaskStatus.COMPLETED
    task.completed_at = timezone.now()
    task.save(update_fields=["status", "completed_at", "updated_at"])
    return task


@transaction.atomic
def reopen_task(*, task: Task) -> Task:
    """Reopen a completed or cancelled task back to todo status."""
    task.status = TaskStatus.TODO
    task.completed_at = None
    task.save(update_fields=["status", "completed_at", "updated_at"])
    return task


@transaction.atomic
def delete_task(*, task: Task) -> None:
    """Delete a task.

    Cascade deletes any subtasks (on_delete=models.CASCADE) to maintain tree integrity.
    """
    task.delete()

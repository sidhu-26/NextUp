"""Task model for NextUP tasks module."""

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from modules.projects.models import Project


class TaskStatus(models.TextChoices):
    """Lifecycle status choices for a task."""

    TODO = "todo", "To Do"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class TaskPriority(models.TextChoices):
    """Priority level choices for a task."""

    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    URGENT = "urgent", "Urgent"


class Task(models.Model):
    """Task entity representing a unit of work, action item, or subtask."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier across all environments.",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks",
        help_text="User who owns this task.",
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
        help_text="Optional project workspace containing this task.",
    )
    parent_task = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="subtasks",
        help_text="Optional parent task if this task is a subtask.",
    )
    title = models.CharField(
        max_length=255,
        help_text="Brief summary or action title for the task.",
    )
    description = models.TextField(
        blank=True,
        default="",
        help_text="Optional detailed description or markdown notes.",
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.TODO,
        db_index=True,
        help_text="Current state in task lifecycle.",
    )
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
        db_index=True,
        help_text="Priority level of the task.",
    )
    due_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional timezone-aware deadline.",
    )
    scheduled_start_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional scheduled calendar start time.",
    )
    scheduled_end_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional scheduled calendar end time.",
    )
    estimated_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Estimated time in minutes to complete this task.",
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Timestamp when task was marked as completed.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when task was created.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when task was last updated.",
    )

    class Meta:
        db_table = "tasks_task"
        verbose_name = "task"
        verbose_name_plural = "tasks"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "status"], name="task_owner_status_idx"),
            models.Index(fields=["owner", "priority"], name="task_owner_priority_idx"),
            models.Index(fields=["owner", "due_at"], name="task_owner_due_idx"),
            models.Index(fields=["owner", "project"], name="task_owner_proj_idx"),
            models.Index(fields=["owner", "parent_task"], name="task_owner_parent_idx"),
            models.Index(
                fields=["owner", "-created_at"], name="task_owner_created_idx"
            ),
            models.Index(
                fields=["owner", "status", "due_at"], name="task_owner_stat_due_idx"
            ),
            models.Index(
                fields=["owner", "scheduled_start_at", "scheduled_end_at"],
                name="task_owner_sched_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(scheduled_start_at__isnull=True)
                | models.Q(scheduled_end_at__isnull=True)
                | models.Q(scheduled_end_at__gt=models.F("scheduled_start_at")),
                name="task_scheduled_end_after_start",
            ),
            models.CheckConstraint(
                condition=models.Q(estimated_minutes__isnull=True)
                | models.Q(estimated_minutes__gt=0),
                name="task_estimated_minutes_positive",
            ),
        ]

    def clean(self) -> None:
        """Validate task constraints and invariants."""
        super().clean()
        errors: dict[str, str] = {}

        # 1. Title validation
        if self.title is not None and not self.title.strip():
            errors["title"] = "Task title cannot be blank."

        # 2. Project ownership validation
        if self.project_id and self.owner_id:
            if self.project.owner_id != self.owner_id:
                errors["project"] = "Task cannot reference another owner's project."

        # 3. Parent task validation
        if self.parent_task_id:
            # Cannot be its own parent
            if self.pk and self.parent_task_id == self.pk:
                errors["parent_task"] = "A task cannot be its own parent."
            elif self.owner_id and self.parent_task.owner_id != self.owner_id:
                errors["parent_task"] = (
                    "A subtask cannot reference another owner's task."
                )
            else:
                # Cycle detection
                visited = {self.pk} if self.pk else set()
                curr = self.parent_task
                while curr is not None:
                    if curr.pk in visited:
                        errors["parent_task"] = (
                            "Parent task relationships cannot contain cycles."
                        )
                        break
                    visited.add(curr.pk)
                    curr = curr.parent_task

        # 4. Scheduled start and end time validation
        if self.scheduled_start_at and self.scheduled_end_at:
            if self.scheduled_end_at <= self.scheduled_start_at:
                errors["scheduled_end_at"] = (
                    "Scheduled end time must be strictly later than scheduled start time."
                )

        # 5. Status and completion timestamp validation
        if self.status == TaskStatus.COMPLETED:
            if not self.completed_at:
                self.completed_at = timezone.now()
        else:
            if self.completed_at:
                errors["completed_at"] = (
                    "Completion timestamp must be empty when task status is not completed."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs) -> None:
        """Run full validation and save task instance."""
        if self.title is not None:
            self.title = self.title.strip()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        """Return human-readable representation."""
        return f"{self.title} [{self.status}]"

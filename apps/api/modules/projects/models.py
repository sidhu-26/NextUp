"""Project model for NextUP projects module."""

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from common.validators import validate_hex_color


class ProjectStatus(models.TextChoices):
    """Project status lifecycle choices."""

    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"


class Project(models.Model):
    """Project entity belonging to an owner.

    Acts as an organizing workspace or container for tasks.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier across all environments.",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
        help_text="User who owns this project.",
    )
    name = models.CharField(
        max_length=255,
        help_text="Project display name.",
    )
    description = models.TextField(
        blank=True,
        default="",
        help_text="Optional project description or notes.",
    )
    color = models.CharField(
        max_length=7,
        blank=True,
        default="",
        validators=[validate_hex_color],
        help_text="Optional hex color string (e.g., #4F46E5 or #FFF).",
    )
    status = models.CharField(
        max_length=20,
        choices=ProjectStatus.choices,
        default=ProjectStatus.ACTIVE,
        db_index=True,
        help_text="Lifecycle state of the project.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when project was created.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when project was last updated.",
    )

    class Meta:
        db_table = "projects_project"
        verbose_name = "project"
        verbose_name_plural = "projects"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "status"], name="proj_owner_status_idx"),
            models.Index(
                fields=["owner", "-created_at"], name="proj_owner_created_idx"
            ),
        ]

    def clean(self) -> None:
        """Validate project attributes."""
        super().clean()
        if self.name is not None and not self.name.strip():
            raise ValidationError({"name": "Project name cannot be blank."})
        if self.color:
            self.color = self.color.strip()

    def save(self, *args, **kwargs) -> None:
        """Run full validation and save project instance."""
        if self.name is not None:
            self.name = self.name.strip()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        """Return human-readable representation."""
        return f"{self.name} ({self.status})"

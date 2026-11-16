"""Selectors for NextUP projects module."""

from typing import TYPE_CHECKING
from uuid import UUID

from django.db.models import QuerySet

from modules.projects.models import Project

if TYPE_CHECKING:
    from modules.accounts.models import User


def get_projects_for_owner(
    owner: "User",
    *,
    status: str | None = None,
) -> QuerySet[Project]:
    """Retrieve owner-scoped projects with optional status filtering.

    Results are consistently ordered by created_at descending.
    """
    queryset = Project.objects.filter(owner=owner)
    if status:
        queryset = queryset.filter(status=status)
    return queryset.order_by("-created_at")


def get_project_by_id_for_owner(
    owner: "User", project_id: UUID | str
) -> Project | None:
    """Retrieve a single project by ID for a given owner, or None if not found."""
    return Project.objects.filter(owner=owner, id=project_id).first()

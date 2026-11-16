"""Services for NextUP projects module."""

from typing import TYPE_CHECKING

from django.db import transaction

from modules.projects.models import Project, ProjectStatus

if TYPE_CHECKING:
    from modules.accounts.models import User


@transaction.atomic
def create_project(
    *,
    owner: "User",
    name: str,
    description: str = "",
    color: str = "",
    status: str = ProjectStatus.ACTIVE,
) -> Project:
    """Create a new project scoped to the owner."""
    project = Project(
        owner=owner,
        name=name,
        description=description,
        color=color,
        status=status,
    )
    project.save()
    return project


@transaction.atomic
def update_project(
    *,
    project: Project,
    **fields,
) -> Project:
    """Update an existing project instance with validated fields."""
    allowed_fields = {"name", "description", "color", "status"}
    for field, value in fields.items():
        if field in allowed_fields:
            setattr(project, field, value)

    project.save()
    return project


@transaction.atomic
def archive_project(*, project: Project) -> Project:
    """Archive a project."""
    project.status = ProjectStatus.ARCHIVED
    project.save(update_fields=["status", "updated_at"])
    return project


@transaction.atomic
def delete_project(*, project: Project) -> None:
    """Delete a project.

    Tasks belonging to this project have their project set to NULL (on_delete=models.SET_NULL),
    preserving the tasks themselves.
    """
    project.delete()

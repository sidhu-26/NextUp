"""Projects application configuration."""

from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    """Configuration for projects application."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "modules.projects"
    verbose_name = "Projects"

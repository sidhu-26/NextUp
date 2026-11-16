"""Tasks application configuration."""

from django.apps import AppConfig


class TasksConfig(AppConfig):
    """Configuration for tasks application."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "modules.tasks"
    verbose_name = "Tasks"

"""Tasks views export."""

from modules.tasks.views.tasks import (
    TaskCompleteView,
    TaskDetailView,
    TaskListCreateView,
    TaskReopenView,
)

__all__ = [
    "TaskListCreateView",
    "TaskDetailView",
    "TaskCompleteView",
    "TaskReopenView",
]

"""Tasks views export."""

from modules.tasks.views.tasks import (
    TaskCompleteView,
    TaskConflictsView,
    TaskDetailView,
    TaskListCreateView,
    TaskReopenView,
)

__all__ = [
    "TaskListCreateView",
    "TaskConflictsView",
    "TaskDetailView",
    "TaskCompleteView",
    "TaskReopenView",
]

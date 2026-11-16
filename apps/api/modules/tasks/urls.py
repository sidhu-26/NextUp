"""URL patterns for NextUP tasks module."""

from django.urls import path

from modules.tasks.views import (
    TaskCompleteView,
    TaskConflictsView,
    TaskDetailView,
    TaskListCreateView,
    TaskReopenView,
)

urlpatterns = [
    path("", TaskListCreateView.as_view(), name="task-list-create"),
    path("conflicts/", TaskConflictsView.as_view(), name="task-conflicts"),
    path("<str:id>/", TaskDetailView.as_view(), name="task-detail"),
    path("<str:id>/complete/", TaskCompleteView.as_view(), name="task-complete"),
    path("<str:id>/reopen/", TaskReopenView.as_view(), name="task-reopen"),
]

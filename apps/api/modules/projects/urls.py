"""URL patterns for NextUP projects module."""

from django.urls import path

from modules.projects.views import ProjectDetailView, ProjectListCreateView

urlpatterns = [
    path("", ProjectListCreateView.as_view(), name="project-list-create"),
    path("<str:id>/", ProjectDetailView.as_view(), name="project-detail"),
]

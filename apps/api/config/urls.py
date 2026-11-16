"""URL configuration for the api project.

The `urlpatterns` list routes URLs to views.
"""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def health_check(request):
    """Health check endpoint for deployment monitoring."""
    return JsonResponse({"status": "healthy", "service": "personal-planner-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
]

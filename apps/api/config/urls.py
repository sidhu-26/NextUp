"""URL configuration and system health checks for NextUP API."""

import logging

from django.contrib import admin
from django.db import connection
from django.http import HttpRequest, JsonResponse
from django.urls import include, path

logger = logging.getLogger(__name__)


def liveness_check(request: HttpRequest) -> JsonResponse:
    """Liveness probe indicating whether the Django process is running and responding.

    Used by Render / orchestrators to verify application process health without
    coupling liveness to external database or downstream dependency availability.
    """
    return JsonResponse({"status": "healthy", "service": "personal-planner-api"})


def readiness_check(request: HttpRequest) -> JsonResponse:
    """Readiness probe verifying database connectivity via a bounded SELECT 1 query.

    Does NOT expose database hostnames, credentials, or internal query errors.
    Full exceptions are safely logged to server-side logs.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            row = cursor.fetchone()
            if not row or row[0] != 1:
                logger.error(
                    "Readiness check query returned unexpected result: %s", row
                )
                return JsonResponse(
                    {"status": "unavailable", "detail": "Database check failed"},
                    status=503,
                )
        return JsonResponse(
            {"status": "ready", "database": "connected"},
            status=200,
        )
    except Exception as exc:
        logger.error(
            "Readiness check database connection error: %s", exc, exc_info=True
        )
        return JsonResponse(
            {"status": "unavailable", "detail": "Database check failed"},
            status=503,
        )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", liveness_check, name="liveness-check"),
    path("api/health/ready/", readiness_check, name="readiness-check"),
    path("api/v1/auth/", include("modules.accounts.urls")),
    path("api/v1/projects/", include("modules.projects.urls")),
    path("api/v1/tasks/", include("modules.tasks.urls")),
]

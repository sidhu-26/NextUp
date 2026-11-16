"""Custom session authentication classes ensuring standard HTTP 401 unauthenticated responses."""

from django.http import HttpRequest
from rest_framework.authentication import SessionAuthentication
from rest_framework.request import Request


class ApiSessionAuthentication(SessionAuthentication):
    """SessionAuthentication returning 401 instead of 403 when unauthenticated.

    Standard DRF SessionAuthentication returns authenticate_header as None,
    which causes DRF to coerce 401 NotAuthenticated into 403 Forbidden.
    Providing an authenticate_header preserves HTTP 401 for API clients.
    """

    def authenticate_header(self, request: HttpRequest | Request) -> str:
        """Return WWW-Authenticate header to preserve HTTP 401 status."""
        return 'Session realm="api"'


class EnforcedSessionAuthentication(ApiSessionAuthentication):
    """SessionAuthentication that strictly enforces CSRF checks even on unauthenticated/anonymous requests.

    Standard DRF SessionAuthentication skips CSRF enforcement if request.user is unauthenticated.
    This class enforces CSRF protection universally on state-changing requests (POST, PUT, DELETE, PATCH).
    """

    def authenticate(self, request: Request) -> tuple | None:
        """Enforce CSRF verification for unsafe methods before handling authentication."""
        result = super().authenticate(request)
        if request.method not in ("GET", "HEAD", "OPTIONS", "TRACE"):
            self.enforce_csrf(request)
        return result

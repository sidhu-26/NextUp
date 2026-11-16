"""Views and API endpoints for NextUP authentication."""

import logging

from django.core.exceptions import PermissionDenied
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from modules.accounts.authentication import (
    ApiSessionAuthentication,
    EnforcedSessionAuthentication,
)
from modules.accounts.serializers.auth import LoginSerializer, UserSerializer
from modules.accounts.services.auth import (
    authenticate_and_login_owner,
    terminate_session,
)
from modules.accounts.throttling import LoginRateThrottle

logger = logging.getLogger(__name__)


class CsrfInitView(APIView):
    """Initialize CSRF cookie token for client-side single page applications.

    GET /api/v1/auth/csrf/
    Sets the csrftoken cookie and returns the token in the response payload.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @method_decorator(ensure_csrf_cookie)
    def get(self, request: Request) -> Response:
        """Return CSRF token and set cookie."""
        csrf_token = get_token(request)
        return Response(
            {"detail": "CSRF cookie set", "csrf_token": csrf_token},
            status=status.HTTP_200_OK,
        )


class LoginView(APIView):
    """Authenticate the application owner and establish a secure session.

    POST /api/v1/auth/login/
    Enforces:
    - CSRF protection via EnforcedSessionAuthentication.
    - Rate limiting via LoginRateThrottle.
    - Owner-identity verification.
    - Session ID rotation.
    - Generic error messages for failed attempts.
    """

    permission_classes = [AllowAny]
    authentication_classes = [EnforcedSessionAuthentication]
    throttle_classes = [LoginRateThrottle]

    def post(self, request: Request) -> Response:
        """Authenticate user credentials and start session."""
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            # Return generic error to prevent user enumeration
            return Response(
                {"detail": "Invalid credentials provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = serializer.validated_data["user"]

        try:
            authenticate_and_login_owner(request._request, user)
        except PermissionDenied as exc:
            logger.warning(
                "Rejected non-owner authentication attempt for user %s: %s",
                user.username,
                exc,
            )
            return Response(
                {"detail": "Invalid credentials provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user_serializer = UserSerializer(user)
        return Response(user_serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Invalidate current session and clear authentication state.

    POST /api/v1/auth/logout/
    Requires:
    - POST method.
    - CSRF token validation via EnforcedSessionAuthentication.
    - Active session invalidation.
    """

    permission_classes = [AllowAny]
    authentication_classes = [EnforcedSessionAuthentication]

    def post(self, request: Request) -> Response:
        """Logout current user and invalidate session."""
        terminate_session(request._request)
        response = Response(
            {"detail": "Successfully logged out."},
            status=status.HTTP_200_OK,
        )
        return response


class CurrentUserView(APIView):
    """Retrieve current authenticated user.

    GET /api/v1/auth/me/
    Requires active authenticated session. Returns 401 when unauthenticated.
    """

    permission_classes = [IsAuthenticated]
    authentication_classes = [ApiSessionAuthentication]

    def get(self, request: Request) -> Response:
        """Return serialized current user profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

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
from rest_framework_simplejwt.tokens import RefreshToken

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
    """Authenticate the application owner and return JWT tokens (access and refresh).

    POST /api/v1/auth/login/
    Supports simple login with email or username + password without requiring CSRF cookies.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateThrottle]

    def post(self, request: Request) -> Response:
        """Authenticate user credentials and return JWT tokens and user info."""
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
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

        # Generate JWT Tokens
        refresh = RefreshToken.for_user(user)
        user_serializer = UserSerializer(user)

        data = {
            **user_serializer.data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
        return Response(data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Invalidate current session and clear authentication state.

    POST /api/v1/auth/logout/
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request: Request) -> Response:
        """Logout current user and invalidate session."""
        try:
            terminate_session(request._request)
        except Exception:
            pass
        response = Response(
            {"detail": "Successfully logged out."},
            status=status.HTTP_200_OK,
        )
        return response


class CurrentUserView(APIView):
    """Retrieve current authenticated user.

    GET /api/v1/auth/me/
    Accepts Bearer JWT Token or Session.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """Return serialized current user profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

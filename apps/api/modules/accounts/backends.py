"""Authentication backends for NextUP accounts module."""

from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from django.http import HttpRequest

User = get_user_model()


class EmailOrUsernameModelBackend(ModelBackend):
    """Authenticate against either username or email address.

    Allows users to log in seamlessly with their username or email.
    Case-insensitive matching for email.
    """

    def authenticate(
        self,
        request: HttpRequest | None = None,
        username: str | None = None,
        password: str | None = None,
        **kwargs: Any,
    ) -> User | None:
        """Authenticate user by username or email and verify password."""
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD) or kwargs.get("email")

        if username is None or password is None:
            return None

        clean_identifier = username.strip()

        try:
            user = User.objects.filter(
                Q(username__iexact=clean_identifier) | Q(email__iexact=clean_identifier)
            ).first()
        except Exception:
            return None

        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None

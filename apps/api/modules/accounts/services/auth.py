"""Authentication services for accounts domain."""

from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.contrib.auth.models import AbstractBaseUser
from django.core.exceptions import PermissionDenied
from django.http import HttpRequest

from modules.accounts.selectors.owner import is_owner_user


def authenticate_and_login_owner(
    request: HttpRequest,
    user: AbstractBaseUser,
) -> None:
    """Establish authenticated session for verified owner user.

    Enforces:
    1. Single-user owner verification (rejects non-owner accounts).
    2. Django session establishment via login().
    3. Session fixation mitigation (session cycle).
    """
    if not is_owner_user(user):
        raise PermissionDenied("Account is not authorized to access this instance.")

    # django_login handles session creation and cycle_key() internally
    django_login(request, user)


def terminate_session(request: HttpRequest) -> None:
    """Invalidate and flush the active session for the request."""
    django_logout(request)
    if hasattr(request, "session"):
        request.session.flush()

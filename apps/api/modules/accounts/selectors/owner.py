"""Account selectors for NextUP accounts module."""

from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


def get_owner_identity() -> tuple[str, str]:
    """Return the configured (owner_username, owner_email) tuple."""
    username = getattr(settings, "OWNER_USERNAME", "").strip()
    email = getattr(settings, "OWNER_EMAIL", "").strip().lower()
    return username, email


def is_owner_user(user: User) -> bool:
    """Verify whether a user model instance is the designated owner.

    Does NOT rely solely on is_staff or is_superuser.
    Compares against configured OWNER_USERNAME or OWNER_EMAIL.
    """
    if not user or not user.is_authenticated:
        return False

    owner_username, owner_email = get_owner_identity()

    # If neither is configured, fail closed
    if not owner_username and not owner_email:
        return False

    matches_username = bool(owner_username and user.username == owner_username)
    matches_email = bool(owner_email and user.email.lower() == owner_email)

    return matches_username or matches_email

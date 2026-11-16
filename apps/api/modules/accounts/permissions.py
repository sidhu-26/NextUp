"""Owner authorization permissions for NextUP accounts module."""

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from modules.accounts.selectors.owner import is_owner_user


class IsOwner(BasePermission):
    """Allows access only to the verified owner of the application.

    Ensures the user is authenticated and matches the designated owner identity.
    """

    message = "Access restricted to application owner."

    def has_permission(self, request: Request, view: APIView) -> bool:
        """Check if request user is authenticated and is the configured owner."""
        return bool(
            request.user
            and request.user.is_authenticated
            and is_owner_user(request.user)
        )

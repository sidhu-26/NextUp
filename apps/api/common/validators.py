"""Hex color validator for NextUP."""

import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

HEX_COLOR_REGEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def validate_hex_color(value: str) -> None:
    """Validate that a string is a valid 3 or 6 hex digit color code (e.g. #FFF or #4F46E5)."""
    if value and not HEX_COLOR_REGEX.match(value):
        raise ValidationError(
            _("%(value)s is not a valid hex color code (e.g. #4F46E5 or #FFF)."),
            params={"value": value},
        )

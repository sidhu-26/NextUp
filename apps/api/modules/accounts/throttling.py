"""Rate limiting throttle for authentication endpoints."""

from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Rate limit login attempts by client IP to mitigate brute force attacks."""

    scope = "login"

"""Serializers for accounts authentication and user representation."""

from django.contrib.auth import authenticate
from django.contrib.auth.models import AbstractBaseUser
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    """Validate username and password credentials."""

    username = serializers.CharField(
        max_length=150,
        required=True,
        trim_whitespace=True,
        error_messages={"blank": "Username is required."},
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
        trim_whitespace=False,
        error_messages={"blank": "Password is required."},
    )

    def validate(self, attrs: dict) -> dict:
        """Validate credentials using Django's authenticate mechanism."""
        username = attrs.get("username")
        password = attrs.get("password")
        request = self.context.get("request")

        user = authenticate(request=request, username=username, password=password)
        if not user:
            raise serializers.ValidationError(
                "Invalid credentials provided.",
                code="authorization",
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "User account is disabled.",
                code="authorization",
            )

        attrs["user"] = user
        return attrs


class UserSerializer(serializers.Serializer):
    """Serialize the minimal authenticated user representation.

    Never exposes password hashes, secrets, or sensitive session keys.
    """

    id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    is_authenticated = serializers.SerializerMethodField()

    def get_is_authenticated(self, obj: AbstractBaseUser) -> bool:
        """Return whether the user is authenticated."""
        return bool(obj and obj.is_authenticated)

"""Custom User model and UserManager for NextUP accounts module."""

import uuid
from typing import Any

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Custom user manager supporting UUID primary keys and case-normalized emails."""

    def create_user(
        self,
        username: str,
        email: str | None = None,
        password: str | None = None,
        **extra_fields: Any,
    ) -> "User":
        """Create and return a regular user with an email and password."""
        if not username:
            raise ValueError("The username field must be set.")
        if not email:
            raise ValueError("The email field must be set.")

        email = self.normalize_email(email).lower()
        username = username.strip()

        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)

        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        username: str,
        email: str | None = None,
        password: str | None = None,
        **extra_fields: Any,
    ) -> "User":
        """Create and return a superuser with an email and password."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(username, email, password, **extra_fields)


class User(AbstractUser):
    """Custom user model using UUID4 primary key and unique normalized email."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier across all environments.",
    )
    email = models.EmailField(
        "email address",
        unique=True,
        error_messages={
            "unique": "A user with that email already exists.",
        },
        help_text="Required. Unique email address (normalized to lowercase).",
    )

    objects = UserManager()

    class Meta:
        db_table = "accounts_user"
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["-date_joined"]

    def clean(self) -> None:
        super().clean()
        if self.email:
            self.email = self.__class__.objects.normalize_email(self.email).lower()

    def __str__(self) -> str:
        return self.username

"""Automated tests for custom User model in modules.accounts."""

import uuid

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group, Permission
from django.db import IntegrityError
from django.test import TestCase

User = get_user_model()


class UserModelTests(TestCase):
    """Test suite verifying User model constraints, UUID handling, and normalization."""

    def test_user_creation_with_uuid(self):
        """User is created with a valid UUID4 primary key."""
        user = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="secure-password-123",
        )
        self.assertIsInstance(user.id, uuid.UUID)
        self.assertEqual(user.username, "owner")
        self.assertEqual(user.email, "owner@example.com")
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertTrue(user.check_password("secure-password-123"))

    def test_superuser_creation(self):
        """Superuser is created with staff and superuser permissions."""
        admin_user = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="admin-password-123",
        )
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)
        self.assertIsInstance(admin_user.id, uuid.UUID)

    def test_email_normalization(self):
        """Emails are normalized to lowercase."""
        user = User.objects.create_user(
            username="testuser",
            email="USER.Name+tag@EXAMPLE.COM",
            password="password-123",
        )
        self.assertEqual(user.email, "user.name+tag@example.com")

    def test_unique_username_constraint(self):
        """Usernames must be unique."""
        User.objects.create_user(
            username="uniqueuser",
            email="first@example.com",
            password="password-123",
        )
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                username="uniqueuser",
                email="second@example.com",
                password="password-456",
            )

    def test_unique_email_constraint(self):
        """Emails must be unique."""
        User.objects.create_user(
            username="userone",
            email="shared@example.com",
            password="password-123",
        )
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                username="usertwo",
                email="shared@example.com",
                password="password-456",
            )

    def test_missing_username_raises_value_error(self):
        """Creating a user without a username raises ValueError."""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                username="",
                email="missing@example.com",
                password="password-123",
            )

    def test_missing_email_raises_value_error(self):
        """Creating a user without an email raises ValueError."""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                username="noemail",
                email="",
                password="password-123",
            )

    def test_django_authentication_compatibility(self):
        """Custom user authenticates correctly using Django standard backend."""
        User.objects.create_user(
            username="authuser",
            email="auth@example.com",
            password="auth-password-789",
        )
        authenticated = authenticate(username="authuser", password="auth-password-789")
        self.assertIsNotNone(authenticated)
        self.assertEqual(authenticated.username, "authuser")

        # Invalid password returns None
        failed = authenticate(username="authuser", password="wrong-password")
        self.assertIsNone(failed)

    def test_django_permissions_and_groups_compatibility(self):
        """User retains full compatibility with Django Groups and Permissions."""
        user = User.objects.create_user(
            username="permuser",
            email="perm@example.com",
            password="password-123",
        )
        group = Group.objects.create(name="Planners")
        user.groups.add(group)

        permission = Permission.objects.filter(codename="add_user").first()
        if permission:
            user.user_permissions.add(permission)
            self.assertTrue(user.has_perm("accounts.add_user"))
        self.assertIn(group, user.groups.all())

"""Automated tests for provision_owner management command."""

import os
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

User = get_user_model()


class ProvisionOwnerCommandTests(TestCase):
    """Test suite for provision_owner management command."""

    def test_provision_owner_non_interactive_success(self):
        """Owner account is created successfully with --non-interactive flag."""
        out = StringIO()
        with patch.dict(os.environ, {"OWNER_PASSWORD": "owner-secret-password"}):
            call_command(
                "provision_owner",
                username="owner",
                email="owner@nextup.internal",
                non_interactive=True,
                stdout=out,
            )

        self.assertIn(
            "Successfully provisioned Staff Owner account 'owner'", out.getvalue()
        )
        user = User.objects.get(username="owner")
        self.assertEqual(user.email, "owner@nextup.internal")
        self.assertTrue(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password("owner-secret-password"))

    def test_provision_superuser_owner(self):
        """Owner account is created with superuser privileges when requested."""
        out = StringIO()
        with patch.dict(os.environ, {"OWNER_PASSWORD": "owner-admin-password"}):
            call_command(
                "provision_owner",
                username="superowner",
                email="super@nextup.internal",
                superuser=True,
                non_interactive=True,
                stdout=out,
            )

        user = User.objects.get(username="superowner")
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)

    def test_idempotent_reexecution(self):
        """Re-running the command with identical credentials does not fail or duplicate."""
        out = StringIO()
        with patch.dict(os.environ, {"OWNER_PASSWORD": "owner-secret-password"}):
            call_command(
                "provision_owner",
                username="owner",
                email="owner@nextup.internal",
                non_interactive=True,
                stdout=out,
            )
            self.assertEqual(User.objects.filter(username="owner").count(), 1)

            # Second execution
            out2 = StringIO()
            call_command(
                "provision_owner",
                username="owner",
                email="owner@nextup.internal",
                non_interactive=True,
                stdout=out2,
            )
            self.assertIn("already exists. No changes made.", out2.getvalue())
            self.assertEqual(User.objects.filter(username="owner").count(), 1)

    def test_conflict_existing_username_different_email(self):
        """Fails cleanly if username exists with a different email."""
        User.objects.create_user(
            username="existingowner",
            email="original@nextup.internal",
            password="pass",
        )
        with patch.dict(os.environ, {"OWNER_PASSWORD": "owner-password"}):
            with self.assertRaises(CommandError) as ctx:
                call_command(
                    "provision_owner",
                    username="existingowner",
                    email="different@nextup.internal",
                    non_interactive=True,
                )
            self.assertIn("already exists with a different email", str(ctx.exception))

    def test_conflict_existing_email_different_username(self):
        """Fails cleanly if email exists with a different username."""
        User.objects.create_user(
            username="firstuser",
            email="common@nextup.internal",
            password="pass",
        )
        with patch.dict(os.environ, {"OWNER_PASSWORD": "owner-password"}):
            with self.assertRaises(CommandError) as ctx:
                call_command(
                    "provision_owner",
                    username="seconduser",
                    email="common@nextup.internal",
                    non_interactive=True,
                )
            self.assertIn(
                "already exists with a different username", str(ctx.exception)
            )

    def test_missing_required_fields(self):
        """Fails when username or email is missing."""
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(CommandError):
                call_command("provision_owner", non_interactive=True)

    def test_missing_password_in_non_interactive_mode(self):
        """Fails when non-interactive mode lacks OWNER_PASSWORD."""
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(CommandError) as ctx:
                call_command(
                    "provision_owner",
                    username="owner",
                    email="owner@nextup.internal",
                    non_interactive=True,
                )
            self.assertIn("requires the OWNER_PASSWORD", str(ctx.exception))

    def test_invalid_email_format(self):
        """Fails when email address format is invalid."""
        with patch.dict(os.environ, {"OWNER_PASSWORD": "password"}):
            with self.assertRaises(CommandError) as ctx:
                call_command(
                    "provision_owner",
                    username="owner",
                    email="invalid-email",
                    non_interactive=True,
                )
            self.assertIn("Invalid email address", str(ctx.exception))

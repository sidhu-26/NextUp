"""Management command to securely provision the initial owner account."""

import getpass
import os
import sys
from typing import Any

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    """Provision the initial NextUP owner account idempotently and securely."""

    help = "Securely provision the initial owner account without exposing credentials."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--username",
            type=str,
            help="Owner username (or use OWNER_USERNAME environment variable).",
        )
        parser.add_argument(
            "--email",
            type=str,
            help="Owner email (or use OWNER_EMAIL environment variable).",
        )
        parser.add_argument(
            "--superuser",
            action="store_true",
            help="Designate the owner account as a superuser (default: staff only).",
        )
        parser.add_argument(
            "--non-interactive",
            action="store_true",
            help=(
                "Read password from OWNER_PASSWORD env var rather than prompt. "
                "Fails if OWNER_PASSWORD is unset."
            ),
        )

    def handle(self, *args: Any, **options: Any) -> None:
        username = options.get("username") or os.environ.get("OWNER_USERNAME")
        email = options.get("email") or os.environ.get("OWNER_EMAIL")
        is_superuser = options.get("superuser", False)
        non_interactive = options.get("non_interactive", False)

        if not username:
            raise CommandError(
                "Owner username required. Provide --username or set OWNER_USERNAME."
            )
        if not email:
            raise CommandError(
                "Owner email required. Provide --email or set OWNER_EMAIL."
            )

        username = username.strip()
        email = email.strip().lower()

        try:
            validate_email(email)
        except ValidationError as exc:
            raise CommandError(f"Invalid email address provided: {exc}") from exc

        # Check existing records to prevent conflicts and ensure idempotency
        existing_by_username = User.objects.filter(username=username).first()
        existing_by_email = User.objects.filter(email=email).first()

        if existing_by_username and existing_by_email:
            if existing_by_username.id == existing_by_email.id:
                self.stdout.write(
                    self.style.WARNING(
                        f"Owner account '{username}' already exists. No changes made."
                    )
                )
                return
            raise CommandError(
                f"Conflicting accounts: username '{username}' and email '{email}' "
                "belong to different accounts."
            )

        if existing_by_username and not existing_by_email:
            raise CommandError(
                f"Account with username '{username}' already exists with a different email."
            )

        if existing_by_email and not existing_by_username:
            raise CommandError(
                f"Account with email '{email}' already exists with a different username."
            )

        # Obtain password securely
        if non_interactive:
            password = os.environ.get("OWNER_PASSWORD")
            if not password:
                raise CommandError(
                    "--non-interactive mode requires the OWNER_PASSWORD environment variable."
                )
        else:
            if not sys.stdin.isatty():
                raise CommandError(
                    "Standard input is not a terminal. Use --non-interactive with OWNER_PASSWORD."
                )
            password = getpass.getpass("Enter password for owner: ")
            password_confirm = getpass.getpass("Confirm password for owner: ")
            if password != password_confirm:
                raise CommandError("Passwords do not match.")

        if not password or len(password.strip()) == 0:
            raise CommandError("Password cannot be empty.")

        with transaction.atomic():
            if is_superuser:
                user = User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password,
                )
            else:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    is_staff=True,
                )

        role_desc = "Superuser" if is_superuser else "Staff Owner"
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully provisioned {role_desc} account '{user.username}'."
            )
        )

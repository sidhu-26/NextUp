"""Tests for database settings, environment validation, and SSL configuration."""

import os
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase


class DatabaseConfigurationTests(SimpleTestCase):
    """Test suite verifying database environment rules and production safety."""

    def test_production_fails_when_secret_key_missing(self):
        """Production settings raise ImproperlyConfigured if DJANGO_SECRET_KEY is missing."""
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(ImproperlyConfigured) as ctx:
                import importlib

                import config.settings.production as prod_settings

                importlib.reload(prod_settings)
            self.assertIn("DJANGO_SECRET_KEY", str(ctx.exception))

    def test_production_fails_when_allowed_hosts_missing(self):
        """Production settings raise ImproperlyConfigured if DJANGO_ALLOWED_HOSTS is missing."""
        env = {
            "DJANGO_SECRET_KEY": "test-secret-key",
            "DJANGO_ALLOWED_HOSTS": "",
            "DATABASE_URL": "postgresql://user:pass@localhost:5432/db",
        }
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(ImproperlyConfigured) as ctx:
                import importlib

                import config.settings.production as prod_settings

                importlib.reload(prod_settings)
            self.assertIn("DJANGO_ALLOWED_HOSTS", str(ctx.exception))

    def test_production_fails_when_database_url_missing(self):
        """Production settings must fail if DATABASE_URL is missing, never falling back to SQLite."""
        env = {
            "DJANGO_SECRET_KEY": "test-secret-key",
            "DJANGO_ALLOWED_HOSTS": "api.render.com",
            "DATABASE_URL": "",
        }
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(ImproperlyConfigured) as ctx:
                import importlib

                import config.settings.production as prod_settings

                importlib.reload(prod_settings)
            self.assertIn(
                "DATABASE_URL environment variable is required", str(ctx.exception)
            )

    def test_production_database_configures_ssl_and_timeouts(self):
        """Production settings configure sslmode=require and bounded timeouts."""
        env = {
            "DJANGO_SECRET_KEY": "test-secret-key",
            "DJANGO_ALLOWED_HOSTS": "api.render.com",
            "DATABASE_URL": "postgresql://postgres:secret@db.supabase.co:5432/postgres",
            "DATABASE_CONNECT_TIMEOUT": "7",
            "DATABASE_CONN_MAX_AGE": "300",
            "OWNER_USERNAME": "admin",
        }
        with patch.dict(os.environ, env, clear=True):
            import importlib

            import config.settings.production as prod_settings

            importlib.reload(prod_settings)

            db_conf = prod_settings.DATABASES["default"]
            self.assertEqual(db_conf["ENGINE"], "django.db.backends.postgresql")
            self.assertEqual(db_conf["OPTIONS"]["sslmode"], "require")
            self.assertEqual(db_conf["OPTIONS"]["connect_timeout"], 7)
            self.assertEqual(db_conf["CONN_MAX_AGE"], 300)
            self.assertTrue(db_conf["CONN_HEALTH_CHECKS"])

    def test_production_fails_when_owner_unconfigured(self):
        """Production settings must fail if OWNER_USERNAME and OWNER_EMAIL are both missing."""
        env = {
            "DJANGO_SECRET_KEY": "test-secret-key",
            "DJANGO_ALLOWED_HOSTS": "api.render.com",
            "DATABASE_URL": "postgresql://postgres:secret@db.supabase.co:5432/postgres",
            "OWNER_USERNAME": "",
            "OWNER_EMAIL": "",
        }
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(ImproperlyConfigured) as ctx:
                import importlib

                import config.settings.production as prod_settings

                importlib.reload(prod_settings)
            self.assertIn(
                "Production environment requires OWNER_USERNAME", str(ctx.exception)
            )

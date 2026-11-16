"""Tests for liveness and readiness health check endpoints."""

from unittest.mock import MagicMock, patch

from django.db import DatabaseError
from django.test import Client, TestCase


class HealthCheckTests(TestCase):
    """Test health and readiness monitoring endpoints."""

    def setUp(self):
        self.client = Client()

    def test_liveness_check(self):
        """Liveness probe returns healthy status."""
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "healthy", "service": "personal-planner-api"},
        )

    def test_readiness_check_success(self):
        """Readiness probe executes SELECT 1 and returns ready status."""
        response = self.client.get("/api/health/ready/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ready", "database": "connected"},
        )

    @patch("config.urls.connection.cursor")
    def test_readiness_check_failure(self, mock_cursor):
        """Readiness probe returns generic 503 without leaking credentials or tracebacks."""
        mock_cursor.side_effect = DatabaseError("Connection refused")
        response = self.client.get("/api/health/ready/")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json(),
            {"status": "unavailable", "detail": "Database check failed"},
        )

    @patch("config.urls.connection.cursor")
    def test_readiness_check_unexpected_row(self, mock_cursor):
        """Readiness probe handles query unexpected output safely."""
        mock_cm = MagicMock()
        mock_cursor.return_value.__enter__.return_value = mock_cm
        mock_cm.fetchone.return_value = (0,)

        response = self.client.get("/api/health/ready/")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json(),
            {"status": "unavailable", "detail": "Database check failed"},
        )

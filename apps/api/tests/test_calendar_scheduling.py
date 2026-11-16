"""Automated backend tests for calendar and scheduling features.

Covers:
- Date-range filtering (scheduled_from, scheduled_to)
- Interval overlap queries: scheduled_start_at < range_end AND scheduled_end_at > range_start
- Invalid date formats and date range bounds (> 90 days)
- Cross-owner isolation
- Conflict detection API (/api/v1/tasks/conflicts/)
- Schedule updates and clearing (unscheduling) via PATCH
- Unscheduled task backlog filtering (is_scheduled=false)
"""

from datetime import datetime, timedelta, timezone

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from modules.projects.services import create_project
from modules.tasks.models import Task
from modules.tasks.selectors import (
    check_task_conflicts_for_owner,
    get_tasks_for_owner,
)
from modules.tasks.services import create_task

User = get_user_model()


@override_settings(
    OWNER_USERNAME="calendar_owner",
    OWNER_EMAIL="cal_owner@example.com",
)
class CalendarSchedulingTests(TestCase):
    """Test suite covering scheduling selectors, views, and conflict checks."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="calendar_owner",
            email="cal_owner@example.com",
            password="SecurePassword123!",
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password="SecurePassword123!",
        )
        self.project = create_project(
            owner=self.owner, name="Sprint Alpha", color="#6366F1"
        )
        self.client = APIClient()

        # Base reference time: 2026-11-16 10:00:00 UTC
        self.base_time = datetime(2026, 11, 16, 10, 0, 0, tzinfo=timezone.utc)

    def test_interval_overlap_selector(self):
        """Verify half-open interval overlap: scheduled_start_at < range_end AND scheduled_end_at > range_start."""
        # Task 1: 10:00 to 11:00
        t1 = create_task(
            owner=self.owner,
            title="Meeting 1",
            scheduled_start_at=self.base_time,
            scheduled_end_at=self.base_time + timedelta(hours=1),
        )
        # Task 2: 11:00 to 12:00
        t2 = create_task(
            owner=self.owner,
            title="Meeting 2",
            scheduled_start_at=self.base_time + timedelta(hours=1),
            scheduled_end_at=self.base_time + timedelta(hours=2),
        )
        # Task 3: 13:00 to 14:00 (outside range)
        t3 = create_task(
            owner=self.owner,
            title="Meeting 3",
            scheduled_start_at=self.base_time + timedelta(hours=3),
            scheduled_end_at=self.base_time + timedelta(hours=4),
        )
        # Task 4: Unscheduled task
        t4 = create_task(
            owner=self.owner,
            title="Unscheduled Backlog Item",
        )

        # Range: 10:30 to 11:30 -> overlaps with t1 (ends 11:00 > 10:30) and t2 (starts 11:00 < 11:30)
        range_start = self.base_time + timedelta(minutes=30)
        range_end = self.base_time + timedelta(hours=1, minutes=30)

        results = list(
            get_tasks_for_owner(
                owner=self.owner,
                scheduled_from=range_start,
                scheduled_to=range_end,
            )
        )
        result_ids = [t.id for t in results]
        self.assertIn(t1.id, result_ids)
        self.assertIn(t2.id, result_ids)
        self.assertNotIn(t3.id, result_ids)
        self.assertNotIn(t4.id, result_ids)

    def test_half_open_interval_boundaries(self):
        """Boundary touching (end == range_start or start == range_end) must NOT count as overlap."""
        # Task runs 10:00 to 11:00
        t = create_task(
            owner=self.owner,
            title="Exact Hour",
            scheduled_start_at=self.base_time,
            scheduled_end_at=self.base_time + timedelta(hours=1),
        )

        # Range before: 09:00 to 10:00 (task starts at range_end)
        before_results = list(
            get_tasks_for_owner(
                owner=self.owner,
                scheduled_from=self.base_time - timedelta(hours=1),
                scheduled_to=self.base_time,
            )
        )
        self.assertNotIn(t.id, [x.id for x in before_results])

        # Range after: 11:00 to 12:00 (task ends at range_start)
        after_results = list(
            get_tasks_for_owner(
                owner=self.owner,
                scheduled_from=self.base_time + timedelta(hours=1),
                scheduled_to=self.base_time + timedelta(hours=2),
            )
        )
        self.assertNotIn(t.id, [x.id for x in after_results])

    def test_cross_owner_isolation_in_calendar(self):
        """Tasks belonging to another user must never be returned in calendar queries."""
        create_task(
            owner=self.other_user,
            title="Secret Other Task",
            scheduled_start_at=self.base_time,
            scheduled_end_at=self.base_time + timedelta(hours=1),
        )

        self.client.force_login(self.owner)
        resp = self.client.get(
            f"/api/v1/tasks/?scheduled_from={self.base_time.isoformat()}&scheduled_to={(self.base_time + timedelta(hours=2)).isoformat()}"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data["results"]
        self.assertEqual(len(results), 0)

    def test_invalid_date_range_validation(self):
        """Test invalid formats, reversed dates, and exceeded range limits."""
        self.client.force_login(self.owner)

        # Invalid format
        resp = self.client.get("/api/v1/tasks/?scheduled_from=invalid-date")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Reversed bounds (to <= from)
        start = self.base_time.isoformat()
        end = (self.base_time - timedelta(hours=1)).isoformat()
        resp = self.client.get(
            f"/api/v1/tasks/?scheduled_from={start}&scheduled_to={end}"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Exceeds 90-day limit
        future_end = (self.base_time + timedelta(days=100)).isoformat()
        resp = self.client.get(
            f"/api/v1/tasks/?scheduled_from={start}&scheduled_to={future_end}"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("exceeds the maximum allowed limit", resp.data["detail"])

    def test_unscheduled_backlog_filtering(self):
        """is_scheduled=false returns only tasks lacking start or end times."""
        scheduled = create_task(
            owner=self.owner,
            title="Scheduled",
            scheduled_start_at=self.base_time,
            scheduled_end_at=self.base_time + timedelta(hours=1),
        )
        unscheduled = create_task(
            owner=self.owner,
            title="Backlog Item",
        )

        self.client.force_login(self.owner)
        resp = self.client.get("/api/v1/tasks/?is_scheduled=false")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        result_ids = [t["id"] for t in resp.data["results"]]
        self.assertIn(str(unscheduled.id), result_ids)
        self.assertNotIn(str(scheduled.id), result_ids)

    def test_conflict_detection_service_and_api(self):
        """Verify conflict detection excludes editing task and flags overlaps."""
        t1 = create_task(
            owner=self.owner,
            title="Existing Event",
            scheduled_start_at=self.base_time,
            scheduled_end_at=self.base_time + timedelta(hours=2),
        )

        # 1. Overlapping window: 10:30 to 11:30
        conflicts = check_task_conflicts_for_owner(
            owner=self.owner,
            start_time=self.base_time + timedelta(minutes=30),
            end_time=self.base_time + timedelta(hours=1, minutes=30),
        )
        self.assertEqual(conflicts.count(), 1)
        self.assertEqual(conflicts.first().id, t1.id)

        # 2. When excluding t1 itself, no conflicts
        conflicts_excluded = check_task_conflicts_for_owner(
            owner=self.owner,
            start_time=self.base_time + timedelta(minutes=30),
            end_time=self.base_time + timedelta(hours=1, minutes=30),
            exclude_task_id=t1.id,
        )
        self.assertEqual(conflicts_excluded.count(), 0)

        # 3. Test API endpoint GET /api/v1/tasks/conflicts/
        self.client.force_login(self.owner)
        start_iso = (self.base_time + timedelta(minutes=30)).isoformat()
        end_iso = (self.base_time + timedelta(hours=1, minutes=30)).isoformat()

        # Without exclusion -> reports conflict
        resp = self.client.get(
            f"/api/v1/tasks/conflicts/?start_at={start_iso}&end_at={end_iso}"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["has_conflicts"])
        self.assertEqual(resp.data["conflicts_count"], 1)

        # With exclusion -> 0 conflicts
        resp2 = self.client.get(
            f"/api/v1/tasks/conflicts/?start_at={start_iso}&end_at={end_iso}&exclude_task_id={t1.id}"
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertFalse(resp2.data["has_conflicts"])
        self.assertEqual(resp2.data["conflicts_count"], 0)

    def test_schedule_and_unschedule_via_patch(self):
        """Verify scheduling a backlog item and later removing it from calendar (unscheduling)."""
        self.client.force_login(self.owner)
        task = create_task(owner=self.owner, title="Draggable Backlog Task")
        self.assertIsNone(task.scheduled_start_at)
        self.assertIsNone(task.scheduled_end_at)

        # 1. Schedule via PATCH
        start = self.base_time.isoformat()
        end = (self.base_time + timedelta(hours=1)).isoformat()
        patch_resp = self.client.patch(
            f"/api/v1/tasks/{task.id}/",
            {"scheduled_start_at": start, "scheduled_end_at": end},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertIsNotNone(task.scheduled_start_at)
        self.assertIsNotNone(task.scheduled_end_at)

        # 2. Resize duration via PATCH (extend by 30 mins)
        new_end = (self.base_time + timedelta(hours=1, minutes=30)).isoformat()
        resize_resp = self.client.patch(
            f"/api/v1/tasks/{task.id}/",
            {"scheduled_end_at": new_end},
            format="json",
        )
        self.assertEqual(resize_resp.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.scheduled_end_at.minute, 30)

        # 3. Unschedule (remove from calendar without deleting task)
        unsched_resp = self.client.patch(
            f"/api/v1/tasks/{task.id}/",
            {"scheduled_start_at": None, "scheduled_end_at": None},
            format="json",
        )
        self.assertEqual(unsched_resp.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertIsNone(task.scheduled_start_at)
        self.assertIsNone(task.scheduled_end_at)
        self.assertTrue(Task.objects.filter(id=task.id).exists())

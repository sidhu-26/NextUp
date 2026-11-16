"""Comprehensive automated tests for NextUP Projects and Tasks modules."""

import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from modules.projects.models import Project, ProjectStatus
from modules.projects.services import (
    archive_project,
    create_project,
    delete_project,
    update_project,
)
from modules.tasks.models import Task, TaskPriority, TaskStatus
from modules.tasks.services import (
    complete_task,
    create_task,
    delete_task,
    reopen_task,
    update_task,
)

User = get_user_model()


@override_settings(
    OWNER_USERNAME="owner_user",
    OWNER_EMAIL="owner@example.com",
)
class ProjectModelAndServiceTests(TestCase):
    """Test project model constraints, validators, and service layer."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner_user",
            email="owner@example.com",
            password="SecurePassword123!",
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password="SecurePassword123!",
        )

    def test_create_project_success(self):
        project = create_project(
            owner=self.owner,
            name="Personal Goals",
            description="2026 milestones",
            color="#4F46E5",
        )
        self.assertIsInstance(project.id, uuid.UUID)
        self.assertEqual(project.owner, self.owner)
        self.assertEqual(project.name, "Personal Goals")
        self.assertEqual(project.status, ProjectStatus.ACTIVE)
        self.assertEqual(project.color, "#4F46E5")

    def test_project_blank_name_rejected(self):
        with self.assertRaises(ValidationError):
            create_project(owner=self.owner, name="   ")

    def test_project_invalid_hex_color_rejected(self):
        with self.assertRaises(ValidationError):
            create_project(owner=self.owner, name="Test", color="invalid-hex")

        with self.assertRaises(ValidationError):
            create_project(owner=self.owner, name="Test", color="#12345")

    def test_project_valid_short_hex_color(self):
        project = create_project(owner=self.owner, name="Short Hex", color="#FFF")
        self.assertEqual(project.color, "#FFF")

    def test_update_project(self):
        project = create_project(owner=self.owner, name="Initial Name")
        updated = update_project(
            project=project,
            name="Updated Name",
            description="Updated description",
            color="#00FF00",
        )
        self.assertEqual(updated.name, "Updated Name")
        self.assertEqual(updated.description, "Updated description")
        self.assertEqual(updated.color, "#00FF00")

    def test_archive_project(self):
        project = create_project(owner=self.owner, name="To Archive")
        archived = archive_project(project=project)
        self.assertEqual(archived.status, ProjectStatus.ARCHIVED)

    def test_delete_project_nullifies_task_project(self):
        project = create_project(owner=self.owner, name="Project With Tasks")
        task = create_task(owner=self.owner, title="Orphan Candidate", project=project)
        self.assertEqual(task.project_id, project.id)

        delete_project(project=project)
        task.refresh_from_db()
        self.assertIsNone(task.project)
        self.assertFalse(Project.objects.filter(id=project.id).exists())


@override_settings(
    OWNER_USERNAME="owner_user",
    OWNER_EMAIL="owner@example.com",
)
class TaskModelAndServiceTests(TestCase):
    """Test task model invariants, constraints, and business logic services."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner_user",
            email="owner@example.com",
            password="SecurePassword123!",
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password="SecurePassword123!",
        )
        self.project = create_project(owner=self.owner, name="Core Work")
        self.other_project = create_project(
            owner=self.other_user, name="Stranger Project"
        )

    def test_create_task_success(self):
        now = timezone.now()
        due = now + timedelta(days=2)
        start = now + timedelta(hours=1)
        end = now + timedelta(hours=2)

        task = create_task(
            owner=self.owner,
            title="Design Schema",
            description="Include all indexes",
            priority=TaskPriority.HIGH,
            status=TaskStatus.TODO,
            project=self.project,
            due_at=due,
            scheduled_start_at=start,
            scheduled_end_at=end,
            estimated_minutes=60,
        )
        self.assertIsInstance(task.id, uuid.UUID)
        self.assertEqual(task.owner, self.owner)
        self.assertEqual(task.project, self.project)
        self.assertEqual(task.priority, TaskPriority.HIGH)
        self.assertEqual(task.status, TaskStatus.TODO)
        self.assertIsNone(task.completed_at)

    def test_blank_title_rejected(self):
        with self.assertRaises(ValidationError):
            create_task(owner=self.owner, title="   ")

    def test_cross_owner_project_rejected(self):
        with self.assertRaises(ValidationError):
            create_task(
                owner=self.owner,
                title="Hacked Task",
                project=self.other_project,
            )

    def test_cross_owner_parent_task_rejected(self):
        foreign_task = create_task(owner=self.other_user, title="Foreign Parent")
        with self.assertRaises(ValidationError):
            create_task(
                owner=self.owner,
                title="Subtask of Foreign",
                parent_task=foreign_task,
            )

    def test_task_cannot_be_own_parent(self):
        task = create_task(owner=self.owner, title="Self Parent Candidate")
        with self.assertRaises(ValidationError):
            update_task(task=task, parent_task=task)

    def test_circular_dependency_rejected(self):
        task_a = create_task(owner=self.owner, title="Task A")
        task_b = create_task(owner=self.owner, title="Task B", parent_task=task_a)
        task_c = create_task(owner=self.owner, title="Task C", parent_task=task_b)

        # Attempting to make task A's parent task C should fail due to cycle A -> B -> C -> A
        with self.assertRaises(ValidationError):
            update_task(task=task_a, parent_task=task_c)

    def test_scheduled_end_before_start_rejected(self):
        now = timezone.now()
        with self.assertRaises(ValidationError):
            create_task(
                owner=self.owner,
                title="Time Warp Task",
                scheduled_start_at=now + timedelta(hours=2),
                scheduled_end_at=now + timedelta(hours=1),
            )

    def test_complete_and_reopen_task(self):
        task = create_task(owner=self.owner, title="Finish Report")
        self.assertEqual(task.status, TaskStatus.TODO)
        self.assertIsNone(task.completed_at)

        completed = complete_task(task=task)
        self.assertEqual(completed.status, TaskStatus.COMPLETED)
        self.assertIsNotNone(completed.completed_at)

        reopened = reopen_task(task=completed)
        self.assertEqual(reopened.status, TaskStatus.TODO)
        self.assertIsNone(reopened.completed_at)

    def test_completion_timestamp_consistency_on_manual_update(self):
        task = create_task(owner=self.owner, title="Status Check")
        # Update to completed automatically sets completed_at if missing
        updated = update_task(task=task, status=TaskStatus.COMPLETED)
        self.assertIsNotNone(updated.completed_at)

        # Update back to todo clears completed_at
        updated_again = update_task(task=updated, status=TaskStatus.TODO)
        self.assertIsNone(updated_again.completed_at)

    def test_delete_parent_task_cascades_to_subtasks(self):
        parent = create_task(owner=self.owner, title="Parent Task")
        subtask1 = create_task(owner=self.owner, title="Subtask 1", parent_task=parent)
        subtask2 = create_task(
            owner=self.owner, title="Subtask 2", parent_task=subtask1
        )

        delete_task(task=parent)
        self.assertFalse(Task.objects.filter(id=parent.id).exists())
        self.assertFalse(Task.objects.filter(id=subtask1.id).exists())
        self.assertFalse(Task.objects.filter(id=subtask2.id).exists())


@override_settings(
    OWNER_USERNAME="owner_user",
    OWNER_EMAIL="owner@example.com",
)
class ProjectAPITests(TestCase):
    """Test Project REST API endpoints, authorization, and validation."""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner_user",
            email="owner@example.com",
            password="SecurePassword123!",
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password="SecurePassword123!",
        )

    def test_unauthenticated_request_rejected(self):
        response = self.client.get("/api/v1/projects/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_owner_request_rejected(self):
        self.client.force_login(self.other_user)
        response = self.client.get("/api/v1/projects/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_and_list_projects(self):
        self.client.force_login(self.owner)
        payload = {
            "name": "Backend Milestone",
            "description": "Tasks API implementation",
            "color": "#4F46E5",
            "status": "active",
        }
        create_resp = self.client.post("/api/v1/projects/", payload, format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        project_id = create_resp.data["id"]

        list_resp = self.client.get("/api/v1/projects/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 1)
        self.assertEqual(list_resp.data[0]["id"], project_id)

    def test_project_detail_and_patch(self):
        self.client.force_login(self.owner)
        project = create_project(owner=self.owner, name="Project Alpha")

        get_resp = self.client.get(f"/api/v1/projects/{project.id}/")
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data["name"], "Project Alpha")

        patch_resp = self.client.patch(
            f"/api/v1/projects/{project.id}/",
            {"name": "Project Alpha Prime", "status": "archived"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["name"], "Project Alpha Prime")
        self.assertEqual(patch_resp.data["status"], "archived")

    def test_delete_project_api(self):
        self.client.force_login(self.owner)
        project = create_project(owner=self.owner, name="Disposable")

        del_resp = self.client.delete(f"/api/v1/projects/{project.id}/")
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Project.objects.filter(id=project.id).exists())

    def test_invalid_uuid_handling(self):
        self.client.force_login(self.owner)
        resp = self.client.get("/api/v1/projects/not-a-valid-uuid/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_owner_isolation(self):
        foreign_project = create_project(owner=self.other_user, name="Secret Foreign")
        self.client.force_login(self.owner)

        # Owner cannot retrieve foreign project
        resp = self.client.get(f"/api/v1/projects/{foreign_project.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


@override_settings(
    OWNER_USERNAME="owner_user",
    OWNER_EMAIL="owner@example.com",
)
class TaskAPITests(TestCase):
    """Test Task REST API endpoints, search, filtering, pagination, and transitions."""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner_user",
            email="owner@example.com",
            password="SecurePassword123!",
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password="SecurePassword123!",
        )
        self.project = create_project(owner=self.owner, name="Main Workspace")

    def test_unauthenticated_request_rejected(self):
        response = self.client.get("/api/v1/tasks/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_owner_request_rejected(self):
        self.client.force_login(self.other_user)
        response = self.client.get("/api/v1/tasks/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_and_retrieve_task(self):
        self.client.force_login(self.owner)
        payload = {
            "title": "Write Unit Tests",
            "description": "Ensure 100% coverage on core rules",
            "priority": "urgent",
            "status": "in_progress",
            "project_id": str(self.project.id),
            "estimated_minutes": 45,
        }
        create_resp = self.client.post("/api/v1/tasks/", payload, format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        task_id = create_resp.data["id"]
        self.assertEqual(create_resp.data["title"], "Write Unit Tests")
        self.assertEqual(create_resp.data["priority"], "urgent")
        self.assertEqual(create_resp.data["project"]["id"], str(self.project.id))

        get_resp = self.client.get(f"/api/v1/tasks/{task_id}/")
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data["id"], task_id)

    def test_cross_owner_project_assignment_rejected(self):
        foreign_project = create_project(owner=self.other_user, name="Foreign Project")
        self.client.force_login(self.owner)

        payload = {
            "title": "Steal Project Task",
            "project_id": str(foreign_project.id),
        }
        response = self.client.post("/api/v1/tasks/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("project_id", response.data)

    def test_cross_owner_parent_task_assignment_rejected(self):
        foreign_task = create_task(owner=self.other_user, title="Foreign Task")
        self.client.force_login(self.owner)

        payload = {
            "title": "Subtask Of Foreign",
            "parent_task_id": str(foreign_task.id),
        }
        response = self.client.post("/api/v1/tasks/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent_task_id", response.data)

    def test_circular_dependency_rejection_via_patch(self):
        self.client.force_login(self.owner)
        task_a = create_task(owner=self.owner, title="Task A")
        task_b = create_task(owner=self.owner, title="Task B", parent_task=task_a)

        # Attempting to assign task B as task A's parent
        patch_resp = self.client.patch(
            f"/api/v1/tasks/{task_a.id}/",
            {"parent_task_id": str(task_b.id)},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_self_parent_rejection_via_patch(self):
        self.client.force_login(self.owner)
        task_a = create_task(owner=self.owner, title="Task A")

        patch_resp = self.client.patch(
            f"/api/v1/tasks/{task_a.id}/",
            {"parent_task_id": str(task_a.id)},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_scheduled_time_validation_api(self):
        self.client.force_login(self.owner)
        now = timezone.now()
        payload = {
            "title": "Invalid Timing",
            "scheduled_start_at": (now + timedelta(hours=3)).isoformat(),
            "scheduled_end_at": (now + timedelta(hours=1)).isoformat(),
        }
        resp = self.client.post("/api/v1/tasks/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scheduled_end_at", resp.data)

    def test_complete_and_reopen_api(self):
        self.client.force_login(self.owner)
        task = create_task(owner=self.owner, title="Complete Me")

        complete_resp = self.client.post(f"/api/v1/tasks/{task.id}/complete/")
        self.assertEqual(complete_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(complete_resp.data["status"], "completed")
        self.assertIsNotNone(complete_resp.data["completed_at"])

        reopen_resp = self.client.post(f"/api/v1/tasks/{task.id}/reopen/")
        self.assertEqual(reopen_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(reopen_resp.data["status"], "todo")
        self.assertIsNone(reopen_resp.data["completed_at"])

    def test_filtering_and_search(self):
        self.client.force_login(self.owner)
        now = timezone.now()

        task1 = create_task(
            owner=self.owner,
            title="Fix PostgreSQL Deadlock",
            description="Investigate pooler sessions",
            status=TaskStatus.TODO,
            priority=TaskPriority.URGENT,
            due_at=now + timedelta(days=1),
        )
        task2 = create_task(
            owner=self.owner,
            title="Update Documentation",
            description="Write API architecture guide",
            status=TaskStatus.COMPLETED,
            priority=TaskPriority.LOW,
            due_at=now + timedelta(days=5),
        )

        # Filter by status
        resp = self.client.get("/api/v1/tasks/?status=completed")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(task2.id))

        # Filter by priority
        resp = self.client.get("/api/v1/tasks/?priority=urgent")
        results = resp.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(task1.id))

        # Search by keyword
        resp = self.client.get("/api/v1/tasks/?search=deadlock")
        results = resp.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(task1.id))

        # Date range filter
        after = (now + timedelta(days=3)).isoformat()
        resp = self.client.get(f"/api/v1/tasks/?due_after={after}")
        results = resp.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(task2.id))

    def test_pagination(self):
        self.client.force_login(self.owner)
        for i in range(25):
            create_task(owner=self.owner, title=f"Paginated Task {i}")

        resp = self.client.get("/api/v1/tasks/?page=1&page_size=10")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 25)
        self.assertEqual(len(resp.data["results"]), 10)
        self.assertIsNotNone(resp.data["next"])

    def test_delete_task_api(self):
        self.client.force_login(self.owner)
        task = create_task(owner=self.owner, title="Temporary Task")
        resp = self.client.delete(f"/api/v1/tasks/{task.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=task.id).exists())

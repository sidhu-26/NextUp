"""Views for NextUP tasks module."""

from uuid import UUID

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from modules.accounts.permissions import IsOwner
from modules.tasks.selectors import get_task_by_id_for_owner, get_tasks_for_owner
from modules.tasks.serializers import (
    TaskCreateSerializer,
    TaskSerializer,
    TaskUpdateSerializer,
)
from modules.tasks.services import (
    complete_task,
    create_task,
    delete_task,
    reopen_task,
    update_task,
)


class TaskPagination(PageNumberPagination):
    """Configurable pagination for Task lists."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class TaskListCreateView(APIView):
    """List and create tasks for the authenticated owner."""

    permission_classes = [IsAuthenticated, IsOwner]
    pagination_class = TaskPagination

    def get(self, request: Request) -> Response:
        """Filter, search, order, and paginate tasks for owner."""
        # Query params
        status_param = request.query_params.get("status")
        priority_param = request.query_params.get("priority")
        project_param = request.query_params.get("project")
        parent_param = request.query_params.get("parent_task")
        include_subtasks_param = request.query_params.get("include_subtasks")
        due_after_param = request.query_params.get("due_after")
        due_before_param = request.query_params.get("due_before")
        search_param = request.query_params.get("search")
        ordering_param = request.query_params.get("ordering")

        # Parse datetime filters (support unencoded '+' if replaced by space in query string)
        if due_after_param:
            due_after = parse_datetime(due_after_param) or parse_datetime(
                due_after_param.replace(" ", "+")
            )
        else:
            due_after = None

        if due_before_param:
            due_before = parse_datetime(due_before_param) or parse_datetime(
                due_before_param.replace(" ", "+")
            )
        else:
            due_before = None

        include_subtasks = None
        if include_subtasks_param is not None:
            include_subtasks = include_subtasks_param.lower() in ("true", "1")

        tasks_qs = get_tasks_for_owner(
            owner=request.user,
            status=status_param,
            priority=priority_param,
            project_id=project_param,
            parent_task_id=parent_param,
            include_subtasks=include_subtasks,
            due_after=due_after,
            due_before=due_before,
            search=search_param,
            ordering=ordering_param,
        )

        paginator = self.pagination_class()
        paginated_tasks = paginator.paginate_queryset(tasks_qs, request, view=self)
        serializer = TaskSerializer(paginated_tasks, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request: Request) -> Response:
        """Create a new task for the authenticated owner."""
        serializer = TaskCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            task = create_task(
                owner=request.user,
                title=data["title"],
                description=data.get("description", ""),
                status=data.get("status", "todo"),
                priority=data.get("priority", "medium"),
                project=data.get("project"),
                parent_task=data.get("parent_task"),
                due_at=data.get("due_at"),
                scheduled_start_at=data.get("scheduled_start_at"),
                scheduled_end_at=data.get("scheduled_end_at"),
                estimated_minutes=data.get("estimated_minutes"),
            )
        except DjangoValidationError as exc:
            return Response(
                {
                    "detail": exc.message_dict
                    if hasattr(exc, "message_dict")
                    else str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)


class TaskDetailView(APIView):
    """Retrieve, update, or delete a single task for the authenticated owner."""

    permission_classes = [IsAuthenticated, IsOwner]

    def _get_task(self, request: Request, task_id: str):
        try:
            uuid_obj = UUID(str(task_id))
        except (ValueError, AttributeError, TypeError):
            return None
        return get_task_by_id_for_owner(request.user, uuid_obj)

    def get(self, request: Request, id: str) -> Response:
        """Get task detail."""
        task = self._get_task(request, id)
        if not task:
            return Response(
                {"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)

    def patch(self, request: Request, id: str) -> Response:
        """Update an existing task."""
        task = self._get_task(request, id)
        if not task:
            return Response(
                {"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = TaskUpdateSerializer(
            data=request.data,
            partial=True,
            context={"request": request, "task": task},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        update_kwargs = {}
        for field in [
            "title",
            "description",
            "status",
            "priority",
            "due_at",
            "scheduled_start_at",
            "scheduled_end_at",
            "estimated_minutes",
        ]:
            if field in data:
                update_kwargs[field] = data[field]

        if "project" in data:
            update_kwargs["project"] = data["project"]
        if "parent_task" in data:
            update_kwargs["parent_task"] = data["parent_task"]

        try:
            updated = update_task(task=task, **update_kwargs)
        except DjangoValidationError as exc:
            return Response(
                {
                    "detail": exc.message_dict
                    if hasattr(exc, "message_dict")
                    else str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(TaskSerializer(updated).data, status=status.HTTP_200_OK)

    def delete(self, request: Request, id: str) -> Response:
        """Delete task and cascade delete its subtasks."""
        task = self._get_task(request, id)
        if not task:
            return Response(
                {"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND
            )

        delete_task(task=task)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskCompleteView(APIView):
    """Mark a task as completed."""

    permission_classes = [IsAuthenticated, IsOwner]

    def post(self, request: Request, id: str) -> Response:
        """Complete a task."""
        try:
            uuid_obj = UUID(str(id))
        except (ValueError, AttributeError, TypeError):
            return Response(
                {"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND
            )

        task = get_task_by_id_for_owner(request.user, uuid_obj)
        if not task:
            return Response(
                {"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND
            )

        completed = complete_task(task=task)
        return Response(TaskSerializer(completed).data, status=status.HTTP_200_OK)


class TaskReopenView(APIView):
    """Reopen a completed or cancelled task back to todo status."""

    permission_classes = [IsAuthenticated, IsOwner]

    def post(self, request: Request, id: str) -> Response:
        """Reopen a task."""
        try:
            uuid_obj = UUID(str(id))
        except (ValueError, AttributeError, TypeError):
            return Response(
                {"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND
            )

        task = get_task_by_id_for_owner(request.user, uuid_obj)
        if not task:
            return Response(
                {"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND
            )

        reopened = reopen_task(task=task)
        return Response(TaskSerializer(reopened).data, status=status.HTTP_200_OK)

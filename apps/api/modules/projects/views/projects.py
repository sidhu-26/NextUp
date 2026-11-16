"""Views for NextUP projects module."""

from uuid import UUID

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from modules.accounts.permissions import IsOwner
from modules.projects.selectors import (
    get_project_by_id_for_owner,
    get_projects_for_owner,
)
from modules.projects.serializers import (
    ProjectCreateSerializer,
    ProjectSerializer,
    ProjectUpdateSerializer,
)
from modules.projects.services import create_project, delete_project, update_project


class ProjectListCreateView(APIView):
    """List projects or create a new project for the authenticated owner."""

    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request: Request) -> Response:
        """List owner's projects with optional status filter."""
        status_param = request.query_params.get("status")
        projects = get_projects_for_owner(request.user, status=status_param)
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        """Create a new project for the owner."""
        serializer = ProjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        try:
            project = create_project(
                owner=request.user,
                name=validated_data["name"],
                description=validated_data.get("description", ""),
                color=validated_data.get("color", ""),
                status=validated_data.get("status", "active"),
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

        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    """Retrieve, update, or delete a specific project belonging to the owner."""

    permission_classes = [IsAuthenticated, IsOwner]

    def _get_project(self, request: Request, project_id: str):
        try:
            uuid_obj = UUID(str(project_id))
        except (ValueError, AttributeError, TypeError):
            return None
        return get_project_by_id_for_owner(request.user, uuid_obj)

    def get(self, request: Request, id: str) -> Response:
        """Get project detail."""
        project = self._get_project(request, id)
        if not project:
            return Response(
                {"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(ProjectSerializer(project).data, status=status.HTTP_200_OK)

    def patch(self, request: Request, id: str) -> Response:
        """Update an existing project."""
        project = self._get_project(request, id)
        if not project:
            return Response(
                {"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProjectUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            updated = update_project(project=project, **serializer.validated_data)
        except DjangoValidationError as exc:
            return Response(
                {
                    "detail": exc.message_dict
                    if hasattr(exc, "message_dict")
                    else str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(ProjectSerializer(updated).data, status=status.HTTP_200_OK)

    def delete(self, request: Request, id: str) -> Response:
        """Delete a project."""
        project = self._get_project(request, id)
        if not project:
            return Response(
                {"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND
            )

        delete_project(project=project)
        return Response(status=status.HTTP_204_NO_CONTENT)

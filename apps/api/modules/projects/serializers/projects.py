"""Serializers for NextUP projects module."""

from rest_framework import serializers

from common.validators import HEX_COLOR_REGEX
from modules.projects.models import Project, ProjectStatus


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project read representations."""

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "color",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ProjectCreateSerializer(serializers.Serializer):
    """Serializer for creating a new project."""

    name = serializers.CharField(max_length=255, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    color = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=7,
    )
    status = serializers.ChoiceField(
        choices=ProjectStatus.choices,
        default=ProjectStatus.ACTIVE,
    )

    def validate_name(self, value: str) -> str:
        """Validate that project name is non-empty after trimming."""
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Project name cannot be blank.")
        return trimmed

    def validate_color(self, value: str) -> str:
        """Validate hex color string."""
        trimmed = value.strip()
        if trimmed and not HEX_COLOR_REGEX.match(trimmed):
            raise serializers.ValidationError(
                "Color must be a valid hex color code (e.g. #4F46E5 or #FFF)."
            )
        return trimmed


class ProjectUpdateSerializer(serializers.Serializer):
    """Serializer for updating an existing project."""

    name = serializers.CharField(required=False, max_length=255, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True)
    color = serializers.CharField(required=False, allow_blank=True, max_length=7)
    status = serializers.ChoiceField(required=False, choices=ProjectStatus.choices)

    def validate_name(self, value: str) -> str:
        """Validate non-blank name."""
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Project name cannot be blank.")
        return trimmed

    def validate_color(self, value: str) -> str:
        """Validate hex color string."""
        trimmed = value.strip()
        if trimmed and not HEX_COLOR_REGEX.match(trimmed):
            raise serializers.ValidationError(
                "Color must be a valid hex color code (e.g. #4F46E5 or #FFF)."
            )
        return trimmed

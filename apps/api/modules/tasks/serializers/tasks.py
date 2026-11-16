"""Serializers for NextUP tasks module."""

from rest_framework import serializers

from modules.projects.models import Project
from modules.projects.serializers import ProjectSerializer
from modules.tasks.models import Task, TaskPriority, TaskStatus


class TaskParentSerializer(serializers.ModelSerializer):
    """Minimal representation of parent task to avoid deep recursion."""

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "status",
            "priority",
        ]
        read_only_fields = fields


class TaskSerializer(serializers.ModelSerializer):
    """Full read serializer for a Task."""

    project = ProjectSerializer(read_only=True)
    parent_task = TaskParentSerializer(read_only=True)
    subtasks_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "project",
            "parent_task",
            "subtasks_count",
            "due_at",
            "scheduled_start_at",
            "scheduled_end_at",
            "estimated_minutes",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_subtasks_count(self, obj: Task) -> int:
        """Return the count of direct subtasks."""
        return obj.subtasks.count()


class TaskCreateSerializer(serializers.Serializer):
    """Serializer for creating a new Task."""

    title = serializers.CharField(max_length=255, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(
        choices=TaskStatus.choices,
        default=TaskStatus.TODO,
    )
    priority = serializers.ChoiceField(
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
    )
    project_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    parent_task_id = serializers.UUIDField(
        required=False, allow_null=True, default=None
    )
    due_at = serializers.DateTimeField(required=False, allow_null=True, default=None)
    scheduled_start_at = serializers.DateTimeField(
        required=False, allow_null=True, default=None
    )
    scheduled_end_at = serializers.DateTimeField(
        required=False, allow_null=True, default=None
    )
    estimated_minutes = serializers.IntegerField(
        required=False, allow_null=True, default=None, min_value=1
    )

    def validate_title(self, value: str) -> str:
        """Validate that task title is non-empty after trimming."""
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Task title cannot be blank.")
        return trimmed

    def validate(self, attrs: dict) -> dict:
        """Validate relational and time range invariants."""
        user = self.context["request"].user

        # Project ownership validation
        project_id = attrs.get("project_id")
        if project_id:
            project = Project.objects.filter(id=project_id, owner=user).first()
            if not project:
                raise serializers.ValidationError(
                    {"project_id": "Project does not exist or does not belong to you."}
                )
            attrs["project"] = project

        # Parent task ownership validation
        parent_task_id = attrs.get("parent_task_id")
        if parent_task_id:
            parent_task = Task.objects.filter(id=parent_task_id, owner=user).first()
            if not parent_task:
                raise serializers.ValidationError(
                    {
                        "parent_task_id": "Parent task does not exist or does not belong to you."
                    }
                )
            attrs["parent_task"] = parent_task

        # Scheduled time validation
        start = attrs.get("scheduled_start_at")
        end = attrs.get("scheduled_end_at")
        if start and end and end <= start:
            raise serializers.ValidationError(
                {
                    "scheduled_end_at": "Scheduled end time must be strictly later than scheduled start time."
                }
            )

        return attrs


class TaskUpdateSerializer(serializers.Serializer):
    """Serializer for updating an existing Task."""

    title = serializers.CharField(required=False, max_length=255, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(required=False, choices=TaskStatus.choices)
    priority = serializers.ChoiceField(required=False, choices=TaskPriority.choices)
    project_id = serializers.UUIDField(required=False, allow_null=True)
    parent_task_id = serializers.UUIDField(required=False, allow_null=True)
    due_at = serializers.DateTimeField(required=False, allow_null=True)
    scheduled_start_at = serializers.DateTimeField(required=False, allow_null=True)
    scheduled_end_at = serializers.DateTimeField(required=False, allow_null=True)
    estimated_minutes = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )

    def validate_title(self, value: str) -> str:
        """Validate non-empty trimmed title."""
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Task title cannot be blank.")
        return trimmed

    def validate(self, attrs: dict) -> dict:
        """Validate relational, hierarchy, and scheduled time rules."""
        user = self.context["request"].user
        instance: Task = self.context.get("task")

        # Project ownership validation
        if "project_id" in attrs:
            project_id = attrs["project_id"]
            if project_id is not None:
                project = Project.objects.filter(id=project_id, owner=user).first()
                if not project:
                    raise serializers.ValidationError(
                        {
                            "project_id": "Project does not exist or does not belong to you."
                        }
                    )
                attrs["project"] = project
            else:
                attrs["project"] = None

        # Parent task ownership & self-parent & circular validation
        if "parent_task_id" in attrs:
            parent_task_id = attrs["parent_task_id"]
            if parent_task_id is not None:
                if instance and parent_task_id == instance.id:
                    raise serializers.ValidationError(
                        {"parent_task_id": "A task cannot be its own parent."}
                    )
                parent_task = Task.objects.filter(id=parent_task_id, owner=user).first()
                if not parent_task:
                    raise serializers.ValidationError(
                        {
                            "parent_task_id": "Parent task does not exist or does not belong to you."
                        }
                    )

                # Cycle check
                if instance:
                    visited = {instance.id}
                    curr = parent_task
                    while curr is not None:
                        if curr.id in visited:
                            raise serializers.ValidationError(
                                {
                                    "parent_task_id": "Parent task relationships cannot contain cycles."
                                }
                            )
                        visited.add(curr.id)
                        curr = curr.parent_task

                attrs["parent_task"] = parent_task
            else:
                attrs["parent_task"] = None

        # Scheduled time check against combined attributes
        start = attrs.get(
            "scheduled_start_at", instance.scheduled_start_at if instance else None
        )
        end = attrs.get(
            "scheduled_end_at", instance.scheduled_end_at if instance else None
        )
        if start and end and end <= start:
            raise serializers.ValidationError(
                {
                    "scheduled_end_at": "Scheduled end time must be strictly later than scheduled start time."
                }
            )

        return attrs

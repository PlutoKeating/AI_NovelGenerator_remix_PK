"""Async task layer for long-running pipeline operations.

Exposes a small singleton :class:`TaskManager` plus enums and the public
:func:`get_task_manager` accessor. The HTTP surface lives in
``backend.api.tasks``.
"""
from backend.tasks.manager import TaskManager, get_task_manager
from backend.tasks.models import Task, TaskEvent, TaskStatus, TaskType

__all__ = [
    "TaskManager",
    "get_task_manager",
    "Task",
    "TaskEvent",
    "TaskStatus",
    "TaskType",
]

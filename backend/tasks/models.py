"""Task dataclasses + enums.

Tasks are runtime objects only — they are not persisted across process
restarts (that's a deliberate Phase 4 scope decision). A Postgres-backed
queue can be slotted in later behind the same ``TaskManager`` API.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class TaskStatus(str, Enum):
    PENDING = "pending"        # accepted, not yet executing
    RUNNING = "running"        # worker is in pipeline call(s)
    SUCCEEDED = "succeeded"    # finished normally
    FAILED = "failed"          # exception inside pipeline
    CANCELLED = "cancelled"    # cancel requested + observed


class TaskType(str, Enum):
    ARCHITECTURE = "architecture"
    BLUEPRINT = "blueprint"
    DRAFT = "draft"
    FINALIZE = "finalize"
    ENRICH = "enrich"
    BATCH = "batch"
    CONSISTENCY = "consistency"


@dataclass
class TaskEvent:
    """Single progress event emitted from a worker."""

    type: str                      # "status" | "progress" | "log" | "error" | "result"
    message: str = ""
    progress: Optional[float] = None  # 0.0 - 1.0 when meaningful
    data: Optional[Dict[str, Any]] = None
    ts: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        d = {"type": self.type, "message": self.message, "ts": self.ts}
        if self.progress is not None:
            d["progress"] = self.progress
        if self.data is not None:
            d["data"] = self.data
        return d


@dataclass
class Task:
    id: str
    type: TaskType
    payload: Dict[str, Any]
    status: TaskStatus = TaskStatus.PENDING
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    finished_at: Optional[float] = None
    progress: float = 0.0
    message: str = ""
    error: Optional[str] = None
    result: Optional[Any] = None
    events: List[TaskEvent] = field(default_factory=list)

    # Cancellation: synchronous workers poll ``cancel_event.is_set()``.
    cancel_event: asyncio.Event = field(default_factory=asyncio.Event, repr=False)
    # Live subscribers — TaskManager fans events out here.
    subscribers: List["asyncio.Queue[TaskEvent | None]"] = field(default_factory=list, repr=False)
    # Backing asyncio Task handle; None until scheduled.
    _asyncio_task: Optional["asyncio.Task[Any]"] = field(default=None, repr=False)

    def snapshot(self) -> Dict[str, Any]:
        """Serialisable snapshot — what the REST status endpoint returns."""
        return {
            "id": self.id,
            "type": self.type.value,
            "status": self.status.value,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "progress": self.progress,
            "message": self.message,
            "error": self.error,
            "result": self.result,
            "payload": self.payload,
        }

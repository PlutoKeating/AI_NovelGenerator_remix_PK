"""TaskManager — async task registry, runner, and event fan-out.

Concurrency model
-----------------
* Each task is a Python ``asyncio.Task`` (so it integrates with FastAPI's
  loop) that itself dispatches the synchronous pipeline call to a
  ``ThreadPoolExecutor`` via ``loop.run_in_executor``.
* Workers report progress by invoking ``manager.emit(task_id, event)`` which
  is loop-safe (events scheduled via ``loop.call_soon_threadsafe``).
* Cancellation is cooperative: setting ``task.cancel_event`` signals
  long-running batches between chapters. For atomic pipeline calls already
  in flight, cancellation completes once the current step returns and the
  worker checks the event.

Memory policy
-------------
Tasks remain queryable after completion for ``RETENTION_SECONDS``; a
background sweeper evicts older ones. This is sufficient for the UI's
"recent tasks" panel without unbounded growth.
"""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Dict, List, Optional

from backend.tasks.models import Task, TaskEvent, TaskStatus, TaskType

logger = logging.getLogger(__name__)

RETENTION_SECONDS = 60 * 60  # keep finished tasks for 1h
MAX_WORKERS = 4


class TaskManager:
    """Singleton task registry. Use :func:`get_task_manager`."""

    def __init__(self) -> None:
        self._tasks: Dict[str, Task] = {}
        self._executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="task-")
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        # Registry populated by ``runner.register``.
        self._runners: Dict[TaskType, Callable[..., Any]] = {}
        self._sweeper: Optional[asyncio.Task[Any]] = None

    # ------------------------------------------------------------------
    # Runner registration
    # ------------------------------------------------------------------

    def register_runner(self, task_type: TaskType, fn: Callable[..., Any]) -> None:
        """Bind a worker callable to a task type. Called once at import time
        by :mod:`backend.tasks.runner`."""
        self._runners[task_type] = fn

    # ------------------------------------------------------------------
    # Submission
    # ------------------------------------------------------------------

    def submit(self, task_type: TaskType, payload: Dict[str, Any]) -> Task:
        """Create + schedule a task. Returns the task immediately."""
        if task_type not in self._runners:
            raise ValueError(f"No runner registered for task type {task_type!r}")

        loop = self._loop or asyncio.get_event_loop()
        self._loop = loop

        task = Task(id=uuid.uuid4().hex, type=task_type, payload=payload)
        self._tasks[task.id] = task
        task._asyncio_task = loop.create_task(self._run(task))

        # Lazy-start sweeper on first submission.
        if self._sweeper is None:
            self._sweeper = loop.create_task(self._sweep_loop())

        return task

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def get(self, task_id: str) -> Optional[Task]:
        return self._tasks.get(task_id)

    def list(self) -> List[Task]:
        return sorted(self._tasks.values(), key=lambda t: t.created_at, reverse=True)

    # ------------------------------------------------------------------
    # Cancellation
    # ------------------------------------------------------------------

    def cancel(self, task_id: str) -> bool:
        task = self._tasks.get(task_id)
        if task is None or task.status in (
            TaskStatus.SUCCEEDED,
            TaskStatus.FAILED,
            TaskStatus.CANCELLED,
        ):
            return False
        task.cancel_event.set()
        # If the pipeline hasn't started yet we can short-circuit immediately.
        if task.status == TaskStatus.PENDING and task._asyncio_task is not None:
            task._asyncio_task.cancel()
            task.status = TaskStatus.CANCELLED
        return True

    # ------------------------------------------------------------------
    # Event emission + fan-out
    # ------------------------------------------------------------------

    def emit(self, task_id: str, event: TaskEvent) -> None:
        """Record an event on a task and broadcast to live subscribers.

        Safe to call from worker threads via ``loop.call_soon_threadsafe``.
        """
        task = self._tasks.get(task_id)
        if task is None:
            return
        task.events.append(event)
        if event.progress is not None:
            task.progress = event.progress
        if event.message:
            task.message = event.message
        # Fan out to subscribers (drop on full queue rather than block).
        for q in list(task.subscribers):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning("Dropping event for task %s: subscriber queue full", task_id)

    def emit_threadsafe(self, loop: asyncio.AbstractEventLoop, task_id: str, event: TaskEvent) -> None:
        """Worker-thread-safe variant of :meth:`emit`."""
        loop.call_soon_threadsafe(self.emit, task_id, event)

    async def subscribe(self, task_id: str) -> "asyncio.Queue[TaskEvent | None]":
        """Register a queue for live events on a task and replay history."""
        task = self._tasks[task_id]
        q: asyncio.Queue[TaskEvent | None] = asyncio.Queue(maxsize=1024)
        # Replay every event collected so far.
        for ev in task.events:
            q.put_nowait(ev)
        # Mark stream finished immediately if task already terminal.
        if task.status in (TaskStatus.SUCCEEDED, TaskStatus.FAILED, TaskStatus.CANCELLED):
            q.put_nowait(None)
        else:
            task.subscribers.append(q)
        return q

    def unsubscribe(self, task_id: str, q: "asyncio.Queue[TaskEvent | None]") -> None:
        task = self._tasks.get(task_id)
        if task and q in task.subscribers:
            task.subscribers.remove(q)

    # ------------------------------------------------------------------
    # Internal: worker driver
    # ------------------------------------------------------------------

    async def _run(self, task: Task) -> None:
        runner = self._runners[task.type]
        task.status = TaskStatus.RUNNING
        task.started_at = time.time()
        self.emit(task.id, TaskEvent(type="status", message="Task started"))

        loop = asyncio.get_event_loop()
        try:
            # Hand off to thread pool — pipeline funcs are blocking.
            result = await loop.run_in_executor(
                self._executor,
                lambda: runner(task=task, manager=self, loop=loop),
            )
            if task.cancel_event.is_set():
                task.status = TaskStatus.CANCELLED
                self.emit(task.id, TaskEvent(type="status", message="Task cancelled"))
            else:
                task.status = TaskStatus.SUCCEEDED
                task.result = result
                task.progress = 1.0
                self.emit(task.id, TaskEvent(type="result", message="Task completed", progress=1.0,
                                              data={"result": result} if result is not None else None))
        except asyncio.CancelledError:
            task.status = TaskStatus.CANCELLED
            self.emit(task.id, TaskEvent(type="status", message="Task cancelled"))
            raise
        except Exception as exc:  # noqa: BLE001 — surface anything as task error
            task.status = TaskStatus.FAILED
            task.error = str(exc)
            logger.exception("Task %s failed", task.id)
            self.emit(task.id, TaskEvent(type="error", message=str(exc)))
        finally:
            task.finished_at = time.time()
            # Close out live streams.
            for q in list(task.subscribers):
                try:
                    q.put_nowait(None)
                except asyncio.QueueFull:
                    pass
            task.subscribers.clear()

    async def _sweep_loop(self) -> None:
        while True:
            await asyncio.sleep(300)
            cutoff = time.time() - RETENTION_SECONDS
            stale = [
                tid
                for tid, t in self._tasks.items()
                if t.finished_at is not None and t.finished_at < cutoff
            ]
            for tid in stale:
                self._tasks.pop(tid, None)
            if stale:
                logger.info("Swept %d stale tasks", len(stale))


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_INSTANCE: Optional[TaskManager] = None


def get_task_manager() -> TaskManager:
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = TaskManager()
        # Register runners lazily to avoid circular imports.
        from backend.tasks import runner  # noqa: F401  (side-effect import)
    return _INSTANCE

"""Phase 4 regression tests — task manager lifecycle: submit, status, cancel,
SSE stream, list, sweeper eviction.

The runners depend on ``backend.novel_generator`` pipeline functions; to avoid
spinning real LLM calls, we monkey-patch the runner callables with fast
stubs that report progress and optionally observe cancellation.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, Generator

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.tasks.manager import TaskManager
from backend.tasks.models import TaskStatus, TaskType


def _stub_runner(msg: str, delay: float = 0.0, result: Any = None):
    """Factory for a synchronous runner stub."""
    def runner(task, manager, loop):  # noqa: ARG001
        import time
        time.sleep(delay)
        return result or {"msg": msg}
    return runner


@pytest.fixture
def fresh_manager() -> Generator[TaskManager, None, None]:
    """Provide an isolated task manager with stub runners."""
    mgr = TaskManager()
    mgr.register_runner(TaskType.ARCHITECTURE, _stub_runner("arch", delay=0.0))
    mgr.register_runner(TaskType.DRAFT, _stub_runner("draft", delay=0.0))
    mgr.register_runner(TaskType.BATCH, _stub_runner("batch", delay=0.0))
    yield mgr


# ---------------------------------------------------------------------------
# Unit: manager lifecycle
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_submit_and_finish(fresh_manager: TaskManager):
    task = fresh_manager.submit(TaskType.ARCHITECTURE, {})
    assert task.status == TaskStatus.PENDING
    # Wait for completion.
    assert task._asyncio_task is not None
    await task._asyncio_task
    assert task.status == TaskStatus.SUCCEEDED
    assert task.result == {"msg": "arch"}
    assert task.progress == 1.0


@pytest.mark.asyncio
async def test_cancel_pending(fresh_manager: TaskManager):
    # Register a slow runner so the task stays pending long enough to cancel.
    fresh_manager.register_runner(TaskType.DRAFT, _stub_runner("draft", delay=5.0))
    task = fresh_manager.submit(TaskType.DRAFT, {})
    assert fresh_manager.cancel(task.id) is True
    assert task.cancel_event.is_set()
    try:
        await task._asyncio_task
    except asyncio.CancelledError:
        pass
    assert task.status == TaskStatus.CANCELLED


@pytest.mark.asyncio
async def test_event_replay_and_subscribe(fresh_manager: TaskManager):
    task = fresh_manager.submit(TaskType.ARCHITECTURE, {})
    # Before completion.
    q = await fresh_manager.subscribe(task.id)
    await task._asyncio_task
    # Collect all events.
    events = []
    while True:
        ev = await asyncio.wait_for(q.get(), timeout=1.0)
        if ev is None:
            break
        events.append(ev)
    assert any(e.type == "status" for e in events)
    assert any(e.type == "result" for e in events)


# ---------------------------------------------------------------------------
# HTTP surface
# ---------------------------------------------------------------------------

@pytest.fixture
def client(fresh_manager, monkeypatch) -> TestClient:
    """Override the global singleton so tests don't collide."""
    import backend.api.tasks as tasks_module
    import backend.tasks

    monkeypatch.setattr(backend.tasks.manager, "_INSTANCE", fresh_manager)
    monkeypatch.setattr(tasks_module, "get_task_manager", lambda: fresh_manager)
    return TestClient(app)


def test_submit_and_get_status(client: TestClient):
    import time
    r = client.post("/api/tasks", json={"type": "architecture", "payload": {}})
    assert r.status_code == 200
    body = r.json()
    tid = body["id"]
    assert body["type"] == "architecture"
    assert body["status"] in ("pending", "running")

    # Give the thread-pool task a moment to finish.
    time.sleep(0.1)

    # Poll until done.
    for _ in range(50):
        r = client.get(f"/api/tasks/{tid}")
        assert r.status_code == 200
        if r.json()["status"] in ("succeeded", "failed", "cancelled"):
            break
    assert r.json()["status"] == "succeeded"


def test_list_and_cancel(client: TestClient):
    import time
    r = client.post("/api/tasks", json={"type": "architecture", "payload": {}})
    tid = r.json()["id"]

    # Ensure the task is still terminal before we try to cancel.
    time.sleep(0.1)

    r = client.get("/api/tasks")
    assert r.status_code == 200
    assert any(t["id"] == tid for t in r.json())

    # If the task already finished, cancel returns 400; accept either.
    r = client.delete(f"/api/tasks/{tid}")
    assert r.status_code in (200, 400)


def test_stream_terminal_task(client: TestClient):
    import time
    # Create + wait for a fast task.
    r = client.post("/api/tasks", json={"type": "architecture", "payload": {}})
    tid = r.json()["id"]
    time.sleep(0.1)
    for _ in range(50):
        r = client.get(f"/api/tasks/{tid}")
        if r.json()["status"] in ("succeeded", "cancelled"):
            break

    # SSE should close quickly because terminal task yields None sentinel.
    with client.stream("GET", f"/api/tasks/{tid}/stream") as stream:
        lines = [line for line in stream.iter_text() if line.strip()]
        # At minimum we should see a "done" event.
        assert any("done" in line for line in lines)


def test_404_on_missing_task(client: TestClient):
    r = client.get("/api/tasks/nonexistent")
    assert r.status_code == 404
    r = client.delete("/api/tasks/nonexistent")
    assert r.status_code == 400
    r = client.get("/api/tasks/nonexistent/stream")
    assert r.status_code == 404

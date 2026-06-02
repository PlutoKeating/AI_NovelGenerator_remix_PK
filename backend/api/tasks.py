"""Async task endpoints — submit, status, stream (SSE), list, cancel.

These routes complement the synchronous ``/api/generate/*`` family; the
frontend can call whichever style fits its UX. Over time the frontend
will migrate toward tasks as the primary generation surface.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.tasks.manager import get_task_manager
from backend.tasks.models import TaskEvent, TaskStatus, TaskType

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TaskSubmitRequest(BaseModel):
    type: str  # architecture | blueprint | draft | finalize | enrich | batch | consistency
    payload: Dict[str, Any]


# ---------------------------------------------------------------------------
# Submission
# ---------------------------------------------------------------------------

@router.post("")
async def submit_task(req: TaskSubmitRequest):
    try:
        task_type = TaskType(req.type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown task type {req.type!r}")
    manager = get_task_manager()
    task = manager.submit(task_type, req.payload)
    return task.snapshot()


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------

@router.get("")
async def list_tasks():
    manager = get_task_manager()
    return [t.snapshot() for t in manager.list()]


@router.get("/{task_id}")
async def get_task(task_id: str):
    manager = get_task_manager()
    task = manager.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.snapshot()


# ---------------------------------------------------------------------------
# Cancellation
# ---------------------------------------------------------------------------

@router.delete("/{task_id}")
async def cancel_task(task_id: str):
    manager = get_task_manager()
    ok = manager.cancel(task_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Task not running or already finished")
    return {"status": "success", "message": "Cancellation requested"}


# ---------------------------------------------------------------------------
# SSE stream
# ---------------------------------------------------------------------------

@router.get("/{task_id}/stream")
async def stream_task(task_id: str):
    manager = get_task_manager()
    task = manager.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    q = await manager.subscribe(task_id)

    async def generator():
        try:
            while True:
                event = await q.get()
                if event is None:
                    # Task terminal or queue drained — send DONE event then stop.
                    yield "data: " + json.dumps({"type": "done"}, ensure_ascii=False) + "\n\n"
                    break
                yield "data: " + json.dumps(event.to_dict(), ensure_ascii=False) + "\n\n"
        except asyncio.CancelledError:
            # Client disconnected.
            pass
        finally:
            manager.unsubscribe(task_id, q)

    return StreamingResponse(generator(), media_type="text/event-stream")

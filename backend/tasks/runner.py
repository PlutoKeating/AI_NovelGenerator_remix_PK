"""Per-task-type worker functions.

Each runner has the signature ``runner(task, manager, loop) -> result``
where:

* ``task``    — the :class:`Task` being executed
* ``manager`` — the :class:`TaskManager` (use ``emit_threadsafe`` for progress)
* ``loop``    — the event loop emit_threadsafe must marshal events through

Runners execute in a background thread, so they MUST NOT touch the event
loop directly — only via ``manager.emit_threadsafe(loop, ...)``.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from backend.pipeline import GenerationContext
from backend.schemas.generation import (
    BatchRequest,
    ConsistencyRequest,
    DraftRequest,
    EnrichRequest,
    GenerationRequest,
)
from backend.services.novel_service import (
    get_word_count,
    read_novel_file,
    write_novel_file,
)
from backend.tasks.manager import TaskManager, get_task_manager
from backend.tasks.models import Task, TaskEvent, TaskType

logger = logging.getLogger(__name__)


def _progress(manager: TaskManager, loop: asyncio.AbstractEventLoop, task: Task, msg: str,
              progress: float | None = None) -> None:
    manager.emit_threadsafe(loop, task.id, TaskEvent(type="progress", message=msg, progress=progress))


def _check_cancelled(task: Task) -> bool:
    return task.cancel_event.is_set()


# ---------------------------------------------------------------------------
# Architecture
# ---------------------------------------------------------------------------

def _run_architecture(task: Task, manager: TaskManager, loop: asyncio.AbstractEventLoop) -> Any:
    from backend.novel_generator import Novel_architecture_generate

    req = GenerationRequest(**task.payload)
    _progress(manager, loop, task, "Resolving config and generating architecture…", 0.1)
    Novel_architecture_generate(**GenerationContext.from_request(req).architecture_kwargs())
    return {"message": "Architecture generated"}


# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------

def _run_blueprint(task: Task, manager: TaskManager, loop: asyncio.AbstractEventLoop) -> Any:
    from backend.novel_generator import Chapter_blueprint_generate

    req = GenerationRequest(**task.payload)
    _progress(manager, loop, task, "Generating chapter blueprint…", 0.1)
    Chapter_blueprint_generate(**GenerationContext.from_request(req).blueprint_kwargs())
    return {"message": "Blueprint generated"}


# ---------------------------------------------------------------------------
# Draft (single chapter)
# ---------------------------------------------------------------------------

def _run_draft(task: Task, manager: TaskManager, loop: asyncio.AbstractEventLoop) -> Any:
    from backend.novel_generator import generate_chapter_draft

    req = DraftRequest(**task.payload)
    ctx = GenerationContext.from_request(req)
    _progress(manager, loop, task, f"Drafting chapter {req.chapter_num}…", 0.2)
    draft = generate_chapter_draft(
        **ctx.chapter_kwargs(),
        custom_prompt_text=req.custom_prompt,
    )
    return {"chapter_num": req.chapter_num, "word_count": get_word_count(draft), "text": draft}


# ---------------------------------------------------------------------------
# Finalize
# ---------------------------------------------------------------------------

def _run_finalize(task: Task, manager: TaskManager, loop: asyncio.AbstractEventLoop) -> Any:
    from backend.novel_generator import finalize_chapter

    req = GenerationRequest(**task.payload)
    _progress(manager, loop, task, f"Finalizing chapter {req.chapter_num}…", 0.2)
    finalize_chapter(**GenerationContext.from_request(req).finalize_kwargs())
    return {"chapter_num": req.chapter_num, "message": "Finalized"}


# ---------------------------------------------------------------------------
# Enrich
# ---------------------------------------------------------------------------

def _run_enrich(task: Task, manager: TaskManager, loop: asyncio.AbstractEventLoop) -> Any:
    from backend.novel_generator import enrich_chapter_text

    req = EnrichRequest(**task.payload)
    _progress(manager, loop, task, "Enriching chapter…", 0.2)
    enriched = enrich_chapter_text(
        **GenerationContext.from_request(req).enrich_kwargs(chapter_text=req.chapter_text)
    )
    return {"text": enriched, "word_count": get_word_count(enriched)}


# ---------------------------------------------------------------------------
# Batch (multi-chapter, cancellable between chapters)
# ---------------------------------------------------------------------------

def _run_batch(task: Task, manager: TaskManager, loop: asyncio.AbstractEventLoop) -> Any:
    from backend.novel_generator import (
        enrich_chapter_text,
        finalize_chapter,
        generate_chapter_draft,
    )

    req = BatchRequest(**task.payload)
    ctx = GenerationContext.from_request(req)

    chapters = list(range(req.start_chapter, req.end_chapter + 1))
    total = max(len(chapters), 1)
    completed: list[int] = []

    for idx, ch_num in enumerate(chapters):
        if _check_cancelled(task):
            return {"completed": completed, "cancelled": True}

        base_prog = idx / total
        _progress(manager, loop, task, f"Drafting chapter {ch_num}…", base_prog + 0.05 / total)
        draft = generate_chapter_draft(**ctx.chapter_kwargs(novel_number=ch_num))

        if req.auto_enrich and get_word_count(draft) < req.min_word_count:
            if _check_cancelled(task):
                return {"completed": completed, "cancelled": True}
            _progress(manager, loop, task, f"Enriching chapter {ch_num}…", base_prog + 0.4 / total)
            draft = enrich_chapter_text(
                **ctx.enrich_kwargs(chapter_text=draft, word_number=req.expected_word_count)
            )

        write_novel_file(req.novel_path, f"chapter_{ch_num}.txt", draft)
        if _check_cancelled(task):
            return {"completed": completed, "cancelled": True}

        _progress(manager, loop, task, f"Finalizing chapter {ch_num}…", base_prog + 0.7 / total)
        finalize_chapter(**ctx.finalize_kwargs(novel_number=ch_num))
        completed.append(ch_num)
        _progress(manager, loop, task, f"Chapter {ch_num} done", (idx + 1) / total)

    return {"completed": completed, "cancelled": False}


# ---------------------------------------------------------------------------
# Consistency check (read-only review)
# ---------------------------------------------------------------------------

def _run_consistency(task: Task, manager: TaskManager, loop: asyncio.AbstractEventLoop) -> Any:
    from backend.consistency_checker import check_consistency

    req = ConsistencyRequest(**task.payload)
    ctx = GenerationContext.from_request(req)
    _progress(manager, loop, task, "Running consistency check…", 0.2)
    result = check_consistency(
        **ctx.consistency_kwargs(
            novel_setting=read_novel_file(req.novel_path, "Novel_architecture.txt"),
            character_state=read_novel_file(req.novel_path, "character_state.txt"),
            global_summary=read_novel_file(req.novel_path, "global_summary.txt"),
            plot_arcs=read_novel_file(req.novel_path, "plot_arcs.txt"),
            chapter_text=req.chapter_text,
        )
    )
    return {"text": result}


# ---------------------------------------------------------------------------
# Register with manager
# ---------------------------------------------------------------------------

_mgr = get_task_manager()
_mgr.register_runner(TaskType.ARCHITECTURE, _run_architecture)
_mgr.register_runner(TaskType.BLUEPRINT, _run_blueprint)
_mgr.register_runner(TaskType.DRAFT, _run_draft)
_mgr.register_runner(TaskType.FINALIZE, _run_finalize)
_mgr.register_runner(TaskType.ENRICH, _run_enrich)
_mgr.register_runner(TaskType.BATCH, _run_batch)
_mgr.register_runner(TaskType.CONSISTENCY, _run_consistency)

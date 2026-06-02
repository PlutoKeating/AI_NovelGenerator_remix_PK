"""Pipeline endpoints — architecture / blueprint / draft / finalize / batch / consistency.

Phase 3 collapses every endpoint to a one-liner against the pipeline by
funnelling the request through :class:`GenerationContext`. The router stays
SYNCHRONOUSLY blocking for back-compat; Phase 4 adds the task layer on top.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

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

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/generate", tags=["generation"])


@router.post("/architecture")
async def generate_architecture(req: GenerationRequest):
    try:
        from backend.novel_generator import Novel_architecture_generate

        Novel_architecture_generate(**GenerationContext.from_request(req).architecture_kwargs())
        return {"status": "success", "message": "Architecture generated"}
    except Exception as e:
        logger.error("Architecture generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/blueprint")
async def generate_blueprint(req: GenerationRequest):
    try:
        from backend.novel_generator import Chapter_blueprint_generate

        Chapter_blueprint_generate(**GenerationContext.from_request(req).blueprint_kwargs())
        return {"status": "success", "message": "Blueprint generated"}
    except Exception as e:
        logger.error("Blueprint generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prompt", response_class=PlainTextResponse)
async def generate_prompt(req: GenerationRequest):
    try:
        from backend.novel_generator import build_chapter_prompt

        return build_chapter_prompt(**GenerationContext.from_request(req).chapter_kwargs())
    except Exception as e:
        logger.error("Prompt build failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/draft", response_class=PlainTextResponse)
async def generate_draft(req: DraftRequest):
    try:
        from backend.novel_generator import generate_chapter_draft

        ctx = GenerationContext.from_request(req)
        return generate_chapter_draft(
            **ctx.chapter_kwargs(),
            custom_prompt_text=req.custom_prompt,
        )
    except Exception as e:
        logger.error("Draft generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/finalize")
async def finalize_chapter_endpoint(req: GenerationRequest):
    try:
        from backend.novel_generator import finalize_chapter

        finalize_chapter(**GenerationContext.from_request(req).finalize_kwargs())
        return {"status": "success", "message": f"Chapter {req.chapter_num} finalized"}
    except Exception as e:
        logger.error("Finalization failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enrich", response_class=PlainTextResponse)
async def enrich_chapter(req: EnrichRequest):
    try:
        from backend.novel_generator import enrich_chapter_text

        return enrich_chapter_text(
            **GenerationContext.from_request(req).enrich_kwargs(chapter_text=req.chapter_text)
        )
    except Exception as e:
        logger.error("Enrichment failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def batch_generate(req: BatchRequest):
    try:
        from backend.novel_generator import (
            enrich_chapter_text,
            finalize_chapter,
            generate_chapter_draft,
        )

        ctx = GenerationContext.from_request(req)

        for ch_num in range(req.start_chapter, req.end_chapter + 1):
            draft = generate_chapter_draft(**ctx.chapter_kwargs(novel_number=ch_num))

            if req.auto_enrich and get_word_count(draft) < req.min_word_count:
                draft = enrich_chapter_text(
                    **ctx.enrich_kwargs(
                        chapter_text=draft,
                        word_number=req.expected_word_count,
                    )
                )

            write_novel_file(req.novel_path, f"chapter_{ch_num}.txt", draft)
            finalize_chapter(**ctx.finalize_kwargs(novel_number=ch_num))

        return {
            "status": "success",
            "message": f"Batch {req.start_chapter}~{req.end_chapter} completed",
        }
    except Exception as e:
        logger.error("Batch generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/consistency", response_class=PlainTextResponse)
async def check_consistency_endpoint(req: ConsistencyRequest):
    try:
        from backend.consistency_checker import check_consistency

        ctx = GenerationContext.from_request(req)
        return check_consistency(
            **ctx.consistency_kwargs(
                novel_setting=read_novel_file(req.novel_path, "Novel_architecture.txt"),
                character_state=read_novel_file(req.novel_path, "character_state.txt"),
                global_summary=read_novel_file(req.novel_path, "global_summary.txt"),
                plot_arcs=read_novel_file(req.novel_path, "plot_arcs.txt"),
                chapter_text=req.chapter_text,
            )
        )
    except Exception as e:
        logger.error("Consistency check failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

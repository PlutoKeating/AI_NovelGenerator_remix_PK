"""AI chat / chat-stream / polish endpoints."""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from backend.llm_service import LLMService
from backend.schemas.ai import AIChatRequest, AIPolishRequest
from backend.services.ai_service import build_chat_prompt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai"])


def _selector(req) -> str | None:
    return req.llm_selector if getattr(req, "llm_selector", "") else None


@router.post("/chat")
async def ai_chat(req: AIChatRequest):
    try:
        result = LLMService().call(build_chat_prompt(req), selector=_selector(req))
        return {"status": "success", "response": result}
    except Exception as e:
        logger.exception("AI chat failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def ai_chat_stream(req: AIChatRequest):
    try:
        service = LLMService()
        sel = _selector(req)

        if req.use_agent:
            from backend.agent_loop import AgentLoop

            agent = AgentLoop(req.novel_id, llm_selector=sel)
            history = [{"role": m.role, "content": m.content} for m in req.messages]

            def gen():
                try:
                    for chunk in agent.run(history):
                        yield (json.dumps(chunk, ensure_ascii=False) + "\n").encode("utf-8")
                except Exception as err:
                    logger.error("Agent stream failed: %s", err)
                    yield (
                        json.dumps(
                            {"type": "status", "message": f"❌ Agent 运行出错: {err}"},
                            ensure_ascii=False,
                        )
                        + "\n"
                    ).encode("utf-8")

            return StreamingResponse(gen(), media_type="text/event-stream")

        prompt = build_chat_prompt(req)

        def gen():
            try:
                for chunk in service.stream(prompt, selector=sel):
                    if chunk:
                        yield chunk.encode("utf-8")
            except Exception as err:
                logger.error("Stream chunk generation failed: %s", err)
                yield f"\n❌ 错误: {err}".encode("utf-8")

        return StreamingResponse(gen(), media_type="text/event-stream")
    except Exception as e:
        logger.exception("AI chat stream initiation failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/polish")
async def ai_polish(req: AIPolishRequest):
    try:
        instr = (
            req.instruction
            or "Please polish and improve the following text while keeping the original meaning:"
        )
        prompt = f"{instr}\n\n{req.text}\n\nPolished version:"
        result = LLMService().call(prompt, selector=_selector(req))
        return {"status": "success", "polished": result}
    except Exception as e:
        logger.exception("AI polish failed")
        raise HTTPException(status_code=500, detail=str(e))

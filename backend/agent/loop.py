"""Core AgentLoop — ReAct / Function-Calling loop.

The loop drives multi-step LLM calls, parses tool requests, executes local
tools, and feeds results back until the model produces a plain-text answer or
the step limit is reached.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Generator, List, Optional

from backend.agent.models import AgentChunk, AssistantMessage, ToolCall
from backend.agent.prompts import inject_system_tool_instructions
from backend.agent.stream_parser import call_llm_with_tools_stream
from backend.llm_service import LLMService
from backend.llm_tools import execute_tool

logger = logging.getLogger(__name__)


class AgentLoop:
    def __init__(
        self,
        novel_id: str,
        llm_selector: Optional[str] = None,
        max_steps: int = 8,
    ):
        self.novel_id = novel_id
        self.llm_selector = llm_selector
        self.max_steps = max_steps
        self.service = LLMService()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(
        self, conversation_history: List[Dict[str, Any]]
    ) -> Generator[Dict[str, Any], None, List[Dict[str, Any]]]:
        """Run the agent loop.

        Yields status / think / content / tool_start / tool_end chunks.
        Returns the final updated conversation history.
        """
        steps = 0
        history = list(conversation_history)
        inject_system_tool_instructions(history)

        yield AgentChunk(
            type="status", message="🌟 AI 智能代理（Agent）启动，开始多任务链式拆解..."
        ).model_dump()

        while steps < self.max_steps:
            steps += 1
            yield AgentChunk(
                type="status", message=f"⏳ 正在进行第 {steps} 轮推理思考与任务规划..."
            ).model_dump()

            llm_cfg = self.service.resolve_llm_config(self.llm_selector)
            try:
                response_message = yield from self._call_llm_stream(llm_cfg, history)
            except Exception:
                logger.exception("Agent API Call failed")
                yield AgentChunk(type="status", message="❌ API 呼叫失败").model_dump()
                break

            # Parse assistant message and append to history
            asst = AssistantMessage(
                content=response_message.get("content", ""),
                reasoning_content=response_message.get("reasoning_content", ""),
                tool_calls=[
                    ToolCall.from_raw(tc)
                    for tc in response_message.get("tool_calls", [])
                ],
            )
            history.append(asst.to_history_dict())

            if not asst.tool_calls:
                yield AgentChunk(
                    type="status", message="🎉 所有拆解任务执行完毕，正在整理并输出最终回复！"
                ).model_dump()
                return history

            yield AgentChunk(
                type="status",
                message=f"⚙️ 检测到 AI 规划了 {len(asst.tool_calls)} 个本地工具任务，开始执行...",
            ).model_dump()

            for tc in asst.tool_calls:
                yield AgentChunk(
                    type="tool_start",
                    tool=tc.function_name,
                    arguments=tc.arguments,
                    message=f"🔧 运行工具 [{tc.function_name}]",
                ).model_dump()

                result = execute_tool(self.novel_id, tc.function_name, tc.arguments)

                yield AgentChunk(
                    type="tool_end",
                    tool=tc.function_name,
                    result=result,
                    message=f"✅ 工具 [{tc.function_name}] 执行完成",
                ).model_dump()

                history.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": tc.function_name,
                    "content": json.dumps(result, ensure_ascii=False),
                })

        if steps >= self.max_steps:
            yield AgentChunk(
                type="status", message="⚠️ 达到了 Agent 最大执行轮数上限，已自动安全拦截。"
            ).model_dump()

        return history

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _call_llm_stream(
        self, cfg, history: List[Dict[str, Any]]
    ) -> Generator[Dict[str, Any], None, Dict[str, Any]]:
        """Wrap the low-level stream parser so that yielded UI chunks bubble up."""
        gen = call_llm_with_tools_stream(cfg, history)
        while True:
            try:
                chunk = next(gen)
                yield chunk
            except StopIteration as exc:
                return exc.value

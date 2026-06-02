"""Pydantic models for Agent streaming chunks and internal state."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class AgentChunk(BaseModel):
    """A single piece of data yielded by the Agent loop to the caller."""

    type: str  # status | think | content | tool_start | tool_end | error | done
    message: str = ""
    content: str = ""          # used by think / content types
    tool: Optional[str] = None
    arguments: Optional[Dict[str, Any]] = None
    result: Optional[Any] = None


class ToolCall(BaseModel):
    """Normalised representation of a tool call from the LLM."""

    id: str
    function_name: str
    arguments: Dict[str, Any]

    @classmethod
    def from_raw(cls, raw: Dict[str, Any]) -> "ToolCall":
        func = raw.get("function", {})
        args_str = func.get("arguments", "{}")
        try:
            args: Dict[str, Any] = (
                __import__("json").loads(args_str) if isinstance(args_str, str) else args_str
            )
        except Exception:
            args = {}
        return cls(
            id=raw.get("id") or f"call_{__import__('uuid').uuid4().hex[:12]}",
            function_name=func.get("name", ""),
            arguments=args,
        )


class AssistantMessage(BaseModel):
    """Structured assistant response after stream accumulation."""

    role: str = "assistant"
    content: str = ""
    reasoning_content: str = ""
    tool_calls: List[ToolCall] = []

    def to_history_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {"role": self.role, "content": self.content}
        if self.reasoning_content:
            d["content"] = (
                f"<think>\n{self.reasoning_content.strip()}\n</think>\n" + self.content
            )
        if self.tool_calls:
            d["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function_name,
                        "arguments": __import__("json").dumps(tc.arguments, ensure_ascii=False),
                    },
                }
                for tc in self.tool_calls
            ]
        return d

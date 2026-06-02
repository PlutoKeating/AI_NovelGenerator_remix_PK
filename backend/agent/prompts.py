"""System-prompt injection with sentinel-based deduplication."""
from __future__ import annotations

from typing import Any, Dict, List

from backend.llm_tools import SYSTEM_TOOL_INSTRUCTIONS

_SENTINEL = "# LLM Function Calling & Tool Use Guide"


def inject_system_tool_instructions(history: List[Dict[str, Any]]) -> None:
    """Mutate *history* in place so that the tool-use system prompt is present
    exactly once.  Uses a sentinel string to detect prior injection.
    """
    already_injected = any(
        msg.get("role") == "system" and _SENTINEL in (msg.get("content") or "")
        for msg in history
    )
    if already_injected:
        return

    existing_system = next((m for m in history if m.get("role") == "system"), None)
    if existing_system is None:
        history.insert(0, {"role": "system", "content": SYSTEM_TOOL_INSTRUCTIONS})
    else:
        existing_system["content"] = (
            SYSTEM_TOOL_INSTRUCTIONS + "\n\n" + (existing_system.get("content") or "")
        )

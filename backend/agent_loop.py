"""Backward-compatibility shim — re-export ``AgentLoop`` from the new
``backend.agent`` package so existing imports keep working.
"""
from backend.agent.loop import AgentLoop  # noqa: F401
from backend.llm_tools import SYSTEM_TOOL_INSTRUCTIONS  # noqa: F401

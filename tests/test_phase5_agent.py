"""Phase 5 regression tests — Agent refactor.

Covers:
* System-prompt injection deduplication
* AgentChunk / ToolCall / AssistantMessage models
* AgentLoop yield types and history shape
* Backward-compat import from backend.agent_loop
"""
from __future__ import annotations

from typing import Any, Dict, List

import pytest

from backend.agent.models import AgentChunk, AssistantMessage, ToolCall
from backend.agent.prompts import inject_system_tool_instructions


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

def test_agent_chunk_defaults():
    c = AgentChunk(type="status", message="hello")
    assert c.type == "status"
    assert c.message == "hello"
    assert c.content == ""
    assert c.tool is None


def test_tool_call_from_raw():
    raw = {
        "id": "tc_1",
        "function": {"name": "query_characters", "arguments": '{"novel_id": "n1"}'},
    }
    tc = ToolCall.from_raw(raw)
    assert tc.id == "tc_1"
    assert tc.function_name == "query_characters"
    assert tc.arguments == {"novel_id": "n1"}


def test_tool_call_from_raw_bad_json():
    raw = {"id": "tc_2", "function": {"name": "x", "arguments": "not json"}}
    tc = ToolCall.from_raw(raw)
    assert tc.arguments == {}


def test_assistant_message_to_history_dict_no_tools():
    a = AssistantMessage(content="hi", reasoning_content="think")
    d = a.to_history_dict()
    assert d["role"] == "assistant"
    assert "think" in d["content"]
    assert "tool_calls" not in d


def test_assistant_message_to_history_dict_with_tools():
    a = AssistantMessage(
        content="ok",
        tool_calls=[ToolCall(id="1", function_name="f", arguments={"a": 1})],
    )
    d = a.to_history_dict()
    assert d["tool_calls"][0]["function"]["name"] == "f"
    assert d["tool_calls"][0]["id"] == "1"


# ---------------------------------------------------------------------------
# Prompt injection
# ---------------------------------------------------------------------------

def test_inject_system_prompt_once():
    hist: List[Dict[str, Any]] = [{"role": "user", "content": "hello"}]
    inject_system_tool_instructions(hist)
    assert hist[0]["role"] == "system"
    assert "Tool Use Guide" in hist[0]["content"]
    # Second call is a no-op
    inject_system_tool_instructions(hist)
    assert sum(1 for m in hist if m["role"] == "system") == 1


def test_inject_system_prompt_appends_to_existing():
    hist = [{"role": "system", "content": "existing"}]
    inject_system_tool_instructions(hist)
    assert "Tool Use Guide" in hist[0]["content"]
    assert "existing" in hist[0]["content"]


def test_inject_system_prompt_detects_sentinel():
    sentinel = "# LLM Function Calling & Tool Use Guide"
    hist = [{"role": "system", "content": f"{sentinel}\nfoo"}]
    inject_system_tool_instructions(hist)
    assert hist[0]["content"] == f"{sentinel}\nfoo"


# ---------------------------------------------------------------------------
# AgentLoop — mocked LLM
# ---------------------------------------------------------------------------

class FakeLLMConfig:
    api_key = "fake"
    base_url = "http://fake"
    model_name = "fake"
    temperature = 0.7
    max_tokens = 512
    timeout = 10


@pytest.fixture
def mock_llm_service(monkeypatch):
    """Patch LLMService.resolve_llm_config to return a fake config."""
    import backend.agent.loop as loop_mod
    import backend.llm_service as svc_mod

    def fake_resolve(self, selector=None):  # noqa: ARG001
        return FakeLLMConfig()

    monkeypatch.setattr(svc_mod.LLMService, "resolve_llm_config", fake_resolve)


def _make_stream_gen(chunks: List[Dict[str, Any]], final: Dict[str, Any]):
    """Build a generator that mimics call_llm_with_tools_stream."""
    def gen():
        for c in chunks:
            yield c
        return final
    return gen()


def test_agent_loop_plain_text_answer(mock_llm_service, monkeypatch):
    """When LLM returns plain text without tool_calls, loop terminates."""
    import backend.agent.loop as loop_mod

    final_msg = {"role": "assistant", "content": "Done"}
    monkeypatch.setattr(
        loop_mod,
        "call_llm_with_tools_stream",
        lambda cfg, hist: _make_stream_gen([], final_msg),
    )

    from backend.agent import AgentLoop

    agent = AgentLoop("novel_1")
    chunks = list(agent.run([{"role": "user", "content": "hello"}]))

    types = [c["type"] for c in chunks]
    assert "status" in types
    assert any("Done" in str(c.get("content", "")) or "最终回复" in c.get("message", "") for c in chunks)


def test_agent_loop_runs_tool_then_answers(mock_llm_service, monkeypatch):
    """LLM requests a tool, then answers with plain text."""
    import backend.agent.loop as loop_mod

    tool_msg = {
        "role": "assistant",
        "content": "",
        "tool_calls": [
            {
                "id": "tc_1",
                "type": "function",
                "function": {"name": "read_novel_file", "arguments": '{"filename": "a.txt"}'},
            }
        ],
    }
    final_msg = {"role": "assistant", "content": "All good"}

    call_count = 0

    def fake_stream(cfg, hist):  # noqa: ARG001
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return _make_stream_gen([], tool_msg)
        return _make_stream_gen([], final_msg)

    monkeypatch.setattr(loop_mod, "call_llm_with_tools_stream", fake_stream)

    # Patch execute_tool so we don't touch the filesystem.
    monkeypatch.setattr(
        loop_mod, "execute_tool", lambda nid, name, args: {"ok": True}
    )

    from backend.agent import AgentLoop

    agent = AgentLoop("novel_1")
    chunks = list(agent.run([{"role": "user", "content": "read file"}]))

    types = [c["type"] for c in chunks]
    assert "tool_start" in types
    assert "tool_end" in types
    assert types.count("status") >= 2  # start + step status messages


def test_agent_loop_respects_max_steps(mock_llm_service, monkeypatch):
    """If LLM always asks for a tool, loop should stop at max_steps."""
    import backend.agent.loop as loop_mod

    tool_msg = {
        "role": "assistant",
        "content": "",
        "tool_calls": [
            {
                "id": "tc_1",
                "type": "function",
                "function": {"name": "noop", "arguments": "{}"},
            }
        ],
    }

    monkeypatch.setattr(
        loop_mod,
        "call_llm_with_tools_stream",
        lambda cfg, hist: _make_stream_gen([], tool_msg),
    )
    monkeypatch.setattr(loop_mod, "execute_tool", lambda nid, name, args: {"ok": True})

    from backend.agent import AgentLoop

    agent = AgentLoop("novel_1", max_steps=2)
    chunks = list(agent.run([{"role": "user", "content": "test"}]))

    assert any("上限" in c.get("message", "") for c in chunks)


# ---------------------------------------------------------------------------
# Backward-compat import
# ---------------------------------------------------------------------------

def test_agent_loop_import_from_legacy_path():
    from backend.agent_loop import AgentLoop as LegacyLoop
    from backend.agent import AgentLoop as NewLoop

    assert LegacyLoop is NewLoop

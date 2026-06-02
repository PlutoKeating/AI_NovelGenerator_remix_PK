"""Streaming LLM call with SSE tool-call parsing.

This module owns the raw HTTP round-trip and incremental reconstruction of
assistant messages, including reasoning content and parallel function calls.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Generator, List

from backend.llm_tools import TOOL_SCHEMAS
from backend.llm_adapters import check_base_url
from backend.llm_service import LLMCallConfig

logger = logging.getLogger(__name__)


def call_llm_with_tools_stream(
    cfg: LLMCallConfig, messages: List[Dict[str, Any]]
) -> Generator[Dict[str, Any], None, Dict[str, Any]]:
    """Build and execute a streaming chat-completion request with tool support.

    Yields intermediate chunks for UI display; returns the fully assembled
    assistant message dict on StopIteration.
    """
    import requests

    headers = {
        "Authorization": f"Bearer {cfg.api_key}",
        "Content-Type": "application/json",
    }

    # Strip local-only metadata before sending to the API.
    formatted_messages = []
    for m in messages:
        msg: Dict[str, Any] = {"role": m.get("role"), "content": m.get("content") or ""}
        if "tool_calls" in m:
            msg["tool_calls"] = m["tool_calls"]
        if "tool_call_id" in m:
            msg["tool_call_id"] = m["tool_call_id"]
            msg["name"] = m.get("name", "")
        formatted_messages.append(msg)

    payload = {
        "model": cfg.model_name,
        "messages": formatted_messages,
        "temperature": cfg.temperature,
        "max_tokens": cfg.max_tokens,
        "tools": TOOL_SCHEMAS,
        "tool_choice": "auto",
        "stream": True,
    }

    base_url = check_base_url(cfg.base_url)
    endpoint = f"{base_url.rstrip('/')}/chat/completions"
    logger.info(
        "Agent Stream POST to %s with %d messages and %d tools",
        endpoint,
        len(formatted_messages),
        len(TOOL_SCHEMAS),
    )

    response = requests.post(
        endpoint, headers=headers, json=payload, timeout=cfg.timeout, stream=True
    )
    if response.status_code != 200:
        raise RuntimeError(f"LLM Tool Call HTTP {response.status_code}: {response.text}")

    full_content = ""
    full_reasoning = ""
    tool_calls_map: Dict[int, Dict[str, Any]] = {}

    buffer = ""
    for chunk in response.iter_content(chunk_size=4096, decode_unicode=True):
        if not chunk:
            continue
        buffer += chunk
        while "\n" in buffer:
            line, buffer = buffer.split("\n", 1)
            line = line.strip()
            if not line or not line.startswith("data: "):
                continue
            data_str = line[6:]
            if data_str == "[DONE]":
                break
            try:
                data = json.loads(data_str)
            except Exception:
                continue
            choices = data.get("choices", [])
            if not choices:
                continue
            delta = choices[0].get("delta", {})

            # 1. Reasoning / thinking content
            reasoning = delta.get("reasoning_content", "")
            if reasoning:
                full_reasoning += reasoning
                yield {"type": "think", "content": reasoning}

            # 2. Normal text content
            content = delta.get("content", "")
            if content:
                full_content += content
                yield {"type": "content", "content": content}

            # 3. Tool calls — incremental, indexed
            for tc in delta.get("tool_calls", []):
                idx = tc.get("index", 0)
                if idx not in tool_calls_map:
                    tool_calls_map[idx] = {
                        "id": tc.get("id", ""),
                        "type": "function",
                        "function": {"name": "", "arguments": ""},
                    }
                if tc.get("id"):
                    tool_calls_map[idx]["id"] = tc["id"]
                if tc.get("function", {}).get("name"):
                    tool_calls_map[idx]["function"]["name"] = tc["function"]["name"]
                if tc.get("function", {}).get("arguments"):
                    tool_calls_map[idx]["function"]["arguments"] += tc["function"]["arguments"]

    # Reconstruct final assistant message
    res_message: Dict[str, Any] = {"role": "assistant", "content": full_content or ""}
    if tool_calls_map:
        res_message["tool_calls"] = [tool_calls_map[i] for i in sorted(tool_calls_map)]
    if full_reasoning:
        res_message["reasoning_content"] = full_reasoning

    return res_message

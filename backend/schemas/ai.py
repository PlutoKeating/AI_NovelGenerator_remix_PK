"""AI chat & polish schemas."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class AIChatRequest(BaseModel):
    novel_id: str
    context_type: str  # "background" | "characters" | "chapter"
    messages: List[ChatMessage]
    llm_selector: str = ""
    chapter_num: Optional[str] = None
    use_agent: bool = False


class AIPolishRequest(BaseModel):
    text: str
    instruction: str = ""
    llm_selector: str = ""

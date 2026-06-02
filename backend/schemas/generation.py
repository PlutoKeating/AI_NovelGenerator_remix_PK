"""Pipeline / generation request schemas."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class GenerationRequest(BaseModel):
    novel_path: str
    chapter_num: int = 1
    topic: str = ""
    genre: str = ""
    num_chapters: int = 10
    word_number: int = 3000
    user_guidance: str = ""
    characters_involved: str = ""
    key_items: str = ""
    scene_location: str = ""
    time_constraint: str = ""
    llm_config_name: str = "default"
    embedding_config_name: str = "default"


class DraftRequest(GenerationRequest):
    custom_prompt: Optional[str] = None


class EnrichRequest(GenerationRequest):
    chapter_text: str


class BatchRequest(GenerationRequest):
    start_chapter: int = 1
    end_chapter: int = 1
    expected_word_count: int = 3000
    min_word_count: int = 2000
    auto_enrich: bool = False


class ConsistencyRequest(GenerationRequest):
    chapter_text: str

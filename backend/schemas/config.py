"""Configuration-related schemas."""
from __future__ import annotations

from typing import Dict, List

from pydantic import BaseModel


# --- Hierarchical provider config ---

class ModelConfig(BaseModel):
    model_name: str
    temperature: float = 0.7
    max_tokens: int = 4096


class KeyConfig(BaseModel):
    api_key: str
    models: List[ModelConfig] = []


class ProviderConfig(BaseModel):
    provider_name: str
    interface_format: str = "OpenAI"
    base_url: str = ""
    timeout: int = 600
    keys: List[KeyConfig] = []
    models: List[ModelConfig] = []


# --- Legacy flat configs (kept for back-compat reads) ---

class LLMConfig(BaseModel):
    api_key: str
    base_url: str
    model_name: str
    temperature: float = 0.7
    max_tokens: int = 4096
    timeout: int = 600
    interface_format: str = "OpenAI"


class EmbeddingConfig(BaseModel):
    api_key: str
    base_url: str
    model_name: str
    retrieval_k: int = 4
    interface_format: str = "OpenAI"


class OtherParams(BaseModel):
    topic: str = ""
    genre: str = ""
    filepath: str = ""
    num_chapters: int = 10
    word_number: int = 3000
    chapter_num: str = "1"
    user_guidance: str = ""
    characters_involved: str = ""
    key_items: str = ""
    scene_location: str = ""
    time_constraint: str = ""


class ChooseConfigs(BaseModel):
    prompt_draft_llm: str = "default"
    chapter_outline_llm: str = "default"
    architecture_llm: str = "default"
    final_chapter_llm: str = "default"
    consistency_review_llm: str = "default"


class ProxySetting(BaseModel):
    proxy_url: str = ""
    proxy_port: str = ""
    enabled: bool = False


class WebDAVConfig(BaseModel):
    webdav_url: str = ""
    webdav_username: str = ""
    webdav_password: str = ""


class AppConfig(BaseModel):
    last_interface_format: str = "OpenAI"
    last_embedding_interface_format: str = "OpenAI"
    providers: List[ProviderConfig] = []
    llm_configs: Dict[str, LLMConfig] = {}
    embedding_configs: Dict[str, EmbeddingConfig] = {}
    other_params: OtherParams = OtherParams()
    choose_configs: ChooseConfigs = ChooseConfigs()
    proxy_setting: ProxySetting = ProxySetting()
    webdav_config: WebDAVConfig = WebDAVConfig()


# --- Test endpoints ---

class TestLLMRequest(BaseModel):
    config_name: str
    llm_config: LLMConfig


class TestEmbeddingRequest(BaseModel):
    config_name: str
    embedding_config: EmbeddingConfig

# backend/llm_service.py
# -*- coding: utf-8 -*-
"""
LLM Service — 统一、解耦、热加载、带倍增重试的LLM调用层

所有业务代码通过 LLMService.call() 调用LLM，无需感知具体provider实现。
配置变更后自动热加载，无需重启服务。
"""
import time
import logging
from typing import Optional, List
from dataclasses import dataclass

from backend.core.config_store import config_store

logger = logging.getLogger(__name__)


@dataclass
class LLMCallConfig:
    provider_name: str
    model_name: str
    api_key: str
    base_url: str
    interface_format: str
    temperature: float
    max_tokens: int
    timeout: int


class LLMService:
    """Singleton LLM service backed by the canonical ``ConfigStore``.

    Hot-reload is delegated to ``backend.core.config_store`` so the in-process
    cache is shared across LLMService, the FastAPI routes and the agent loop.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load_config(self) -> dict:
        """Return the latest config dict, hot-reloading via ConfigStore mtime check."""
        return config_store.load()

    def resolve_llm_config(self, selector: Optional[str] = None) -> LLMCallConfig:
        """
        从层级配置中解析出调用所需的全部参数。

        selector格式：
          - "provider_name/model_name"          → 使用provider第一个key
          - "provider_name/model_name@key_idx"  → 使用指定key索引
          - None / ""                           → 使用第一个可用的provider+model+key
        """
        config = self._load_config()
        providers = config.get("providers", [])

        # 无selector时，使用第一个provider的第一个model和第一个key
        if not selector:
            if not providers:
                raise RuntimeError("No providers configured")
            p = providers[0]
            keys = p.get("keys", [])
            models = p.get("models", [])
            if not keys:
                k = {}
            else:
                k = keys[0]
            if not models:
                raise RuntimeError(f"Provider {p.get('provider_name')} has no models")
            m = models[0]
            return LLMCallConfig(
                provider_name=p.get("provider_name", ""),
                model_name=m.get("model_name", ""),
                api_key=k.get("api_key", ""),
                base_url=p.get("base_url", ""),
                interface_format=p.get("interface_format", "OpenAI"),
                temperature=m.get("temperature", 0.7),
                max_tokens=m.get("max_tokens", 4096),
                timeout=p.get("timeout", 600),
            )

        # 解析selector
        key_idx = 0
        if "@" in selector:
            selector, key_part = selector.rsplit("@", 1)
            try:
                key_idx = int(key_part)
            except ValueError:
                key_idx = 0

        provider_name, model_name = selector.split("/", 1) if "/" in selector else (selector, "")

        # 查找provider
        p = next((pr for pr in providers if pr.get("provider_name") == provider_name), None)
        if p is None:
            raise RuntimeError(f"Provider '{provider_name}' not found")

        keys = p.get("keys", [])
        models = p.get("models", [])

        if not keys:
            k = {}
        else:
            if key_idx >= len(keys):
                key_idx = 0
            k = keys[key_idx]

        # 查找model
        if model_name:
            m = next((mo for mo in models if mo.get("model_name") == model_name), None)
            if m is None:
                m = next((mo for mo in k.get("models", []) if mo.get("model_name") == model_name), None)
            if m is None:
                raise RuntimeError(f"Model '{model_name}' not found in provider '{provider_name}'")
        else:
            m = models[0] if models else (k.get("models", [])[0] if k.get("models") else {})

        return LLMCallConfig(
            provider_name=p.get("provider_name", ""),
            model_name=m.get("model_name", ""),
            api_key=k.get("api_key", ""),
            base_url=p.get("base_url", ""),
            interface_format=p.get("interface_format", "OpenAI"),
            temperature=m.get("temperature", 0.7),
            max_tokens=m.get("max_tokens", 4096),
            timeout=p.get("timeout", 600),
        )

    def _create_adapter(self, cfg: LLMCallConfig):
        """创建底层adapter实例。"""
        from backend.llm_adapters import create_llm_adapter
        return create_llm_adapter(
            interface_format=cfg.interface_format,
            base_url=cfg.base_url,
            model_name=cfg.model_name,
            api_key=cfg.api_key,
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
            timeout=cfg.timeout,
        )

    def call(
        self,
        prompt: str,
        selector: Optional[str] = None,
        max_retries: int = 5,
        base_wait: float = 1.0,
        multiplier: float = 2.0,
        fallback_return: Optional[str] = None,
    ) -> str:
        """
        统一LLM调用入口，带倍增等待时长重试机制。

        重试策略（默认）：
          第1次失败后等待 1s
          第2次失败后等待 2s
          第3次失败后等待 4s
          第4次失败后等待 8s
          第5次失败后等待 16s
          总计最大等待约 31s
        """
        llm_cfg = self.resolve_llm_config(selector)
        adapter = self._create_adapter(llm_cfg)

        wait_time = base_wait
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                result = adapter.invoke(prompt)
                if result:
                    cleaned = result.replace("```", "").strip()
                    if cleaned:
                        return cleaned
                    logger.warning(f"LLM returned empty content on attempt {attempt}")
                else:
                    logger.warning(f"LLM returned None on attempt {attempt}")
            except Exception as e:
                last_error = e
                logger.warning(f"LLM call attempt {attempt}/{max_retries} failed: {e}")

            if attempt < max_retries:
                logger.info(f"Retrying in {wait_time}s...")
                time.sleep(wait_time)
                wait_time *= multiplier
            else:
                logger.error(f"Max retries ({max_retries}) reached. Last error: {last_error}")

        if fallback_return is not None:
            return fallback_return
        raise RuntimeError(f"LLM call failed after {max_retries} retries. Last error: {last_error}")

    def stream(self, prompt: str, selector: Optional[str] = None):
        """流式调用接口。"""
        llm_cfg = self.resolve_llm_config(selector)
        adapter = self._create_adapter(llm_cfg)
        return adapter.stream(prompt)

    def list_available_selectors(self) -> List[str]:
        """列出所有可用的llm_selector字符串，供前端选择。"""
        config = self._load_config()
        providers = config.get("providers", [])
        selectors = []
        for p in providers:
            pname = p.get("provider_name", "")
            for idx, k in enumerate(p.get("keys", [])):
                # provider级别的models
                for m in p.get("models", []):
                    if len(p.get("keys", [])) > 1:
                        selectors.append(f"{pname}/{m.get('model_name')}@{idx}")
                    else:
                        selectors.append(f"{pname}/{m.get('model_name')}")
                # key级别的models
                for m in k.get("models", []):
                    sel = f"{pname}/{m.get('model_name')}"
                    if len(p.get("keys", [])) > 1:
                        sel += f"@{idx}"
                    if sel not in selectors:
                        selectors.append(sel)
        return selectors

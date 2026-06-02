"""Phase 3 regression tests — :class:`GenerationContext` must produce kwargs
that exactly match the underlying pipeline function signatures.

Catching kwarg drift here is the whole point of having a Context object — if
``backend.novel_generator`` adds/removes a parameter, this test fails fast.
"""
from __future__ import annotations

import inspect

import pytest

from backend.consistency_checker import check_consistency
from backend.core.config_store import config_store
from backend.novel_generator import (
    Chapter_blueprint_generate,
    Novel_architecture_generate,
    build_chapter_prompt,
    enrich_chapter_text,
    finalize_chapter,
    generate_chapter_draft,
)
from backend.pipeline import GenerationContext
from backend.schemas.generation import (
    BatchRequest,
    ConsistencyRequest,
    DraftRequest,
    EnrichRequest,
    GenerationRequest,
)


@pytest.fixture(autouse=True)
def _seed_provider():
    """Give the LLMService something resolvable so ``from_request`` works."""
    config_store.save({
        "providers": [
            {
                "provider_name": "p",
                "interface_format": "OpenAI",
                "base_url": "https://example.invalid/v1",
                "timeout": 600,
                "keys": [{"api_key": "sk-x"}],
                "models": [{"model_name": "gpt-test"}],
            }
        ],
        "embedding_configs": {},
    })
    yield


def _kwargs_match(func, kwargs: dict):
    sig_params = set(inspect.signature(func).parameters.keys())
    extra = set(kwargs.keys()) - sig_params
    assert not extra, f"{func.__name__}: kwargs not accepted by signature: {extra}"
    # Required positional/kwonly params (no defaults) must all be supplied.
    required = {
        n for n, p in inspect.signature(func).parameters.items()
        if p.default is inspect.Parameter.empty
        and p.kind not in (inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD)
    }
    missing = required - set(kwargs.keys())
    assert not missing, f"{func.__name__}: required params missing from kwargs: {missing}"


def _make_request(cls=GenerationRequest, **overrides):
    base = dict(
        novel_path="dummy_novel",
        chapter_num=3,
        topic="t",
        genre="g",
        num_chapters=10,
        word_number=2500,
        user_guidance="ug",
        characters_involved="c",
        key_items="k",
        scene_location="s",
        time_constraint="tc",
        llm_config_name="default",
        embedding_config_name="default",
    )
    base.update(overrides)
    return cls(**base)


def test_architecture_kwargs_match_signature():
    ctx = GenerationContext.from_request(_make_request())
    _kwargs_match(Novel_architecture_generate, ctx.architecture_kwargs())


def test_blueprint_kwargs_match_signature():
    ctx = GenerationContext.from_request(_make_request())
    _kwargs_match(Chapter_blueprint_generate, ctx.blueprint_kwargs())


def test_chapter_kwargs_match_prompt_and_draft_signatures():
    ctx = GenerationContext.from_request(_make_request())
    _kwargs_match(build_chapter_prompt, ctx.chapter_kwargs())
    # Draft accepts an extra optional ``custom_prompt_text``.
    _kwargs_match(generate_chapter_draft, {**ctx.chapter_kwargs(), "custom_prompt_text": None})


def test_finalize_kwargs_match_signature():
    ctx = GenerationContext.from_request(_make_request())
    _kwargs_match(finalize_chapter, ctx.finalize_kwargs())


def test_enrich_kwargs_match_signature():
    req = _make_request(EnrichRequest, chapter_text="x")
    ctx = GenerationContext.from_request(req)
    _kwargs_match(enrich_chapter_text, ctx.enrich_kwargs(chapter_text=req.chapter_text))


def test_consistency_kwargs_match_signature():
    req = _make_request(ConsistencyRequest, chapter_text="x")
    ctx = GenerationContext.from_request(req)
    _kwargs_match(
        check_consistency,
        ctx.consistency_kwargs(
            novel_setting="ns",
            character_state="cs",
            global_summary="gs",
            plot_arcs="pa",
            chapter_text=req.chapter_text,
        ),
    )


def test_batch_uses_per_chapter_novel_number():
    """Per-chapter context method must be able to override novel_number."""
    ctx = GenerationContext.from_request(_make_request(BatchRequest, start_chapter=2, end_chapter=4))
    kw1 = ctx.chapter_kwargs(novel_number=2)
    kw2 = ctx.chapter_kwargs(novel_number=3)
    assert kw1["novel_number"] == 2
    assert kw2["novel_number"] == 3
    # Returned dicts must be independent (mutation safety).
    kw1["novel_number"] = 999
    assert kw2["novel_number"] == 3

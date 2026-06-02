"""GenerationContext — request-to-pipeline kwargs bundler.

Why this exists
---------------
The generation router historically repeated the same 13-to-22 keyword
arguments per pipeline call. This was the single biggest source of subtle
drift bugs: any new pipeline knob had to be hand-threaded through 7+
endpoints, and the order/name mapping (``llm_model`` vs ``model_name``) was
easy to get wrong.

``GenerationContext`` bundles:

* ``llm``      — resolved LLM call params
* ``embedding``— resolved embedding params
* ``filepath`` — absolute novel directory
* ``req``      — the original Pydantic request (for chapter-specific fields)

…and exposes per-pipeline-function builders that emit the exact ``**kwargs``
dict each pipeline entry point expects. Routers shrink to a one-liner.

Note: we intentionally preserve the historical naming asymmetry where
some pipeline funcs accept ``llm_model`` and others ``model_name``. Cleaning
up that inconsistency is a separate, deeper refactor inside
``backend.novel_generator``.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict

from backend.services.generation_service import (
    get_embedding_params_from_request,
    get_llm_params_from_request,
)
from backend.services.novel_service import get_novel_dir


@dataclass
class GenerationContext:
    """Resolved parameters + the originating request.

    Construct via :meth:`from_request`. All ``*_kwargs()`` methods return a
    fresh dict so callers may mutate the result without affecting the
    context.
    """

    llm: Dict[str, Any]
    embedding: Dict[str, Any]
    filepath: str
    req: Any = field(repr=False)

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    @classmethod
    def from_request(cls, req: Any) -> "GenerationContext":
        """Resolve LLM + embedding + filepath from a generation request."""
        return cls(
            llm=get_llm_params_from_request(req),
            embedding=get_embedding_params_from_request(req),
            filepath=get_novel_dir(req.novel_path),
            req=req,
        )

    # ------------------------------------------------------------------
    # Building blocks
    # ------------------------------------------------------------------

    def _llm_core(self) -> Dict[str, Any]:
        """Common LLM kwargs accepted by ALL pipeline funcs."""
        return {
            "api_key": self.llm["api_key"],
            "base_url": self.llm["base_url"],
            "temperature": self.llm["temperature"],
            "interface_format": self.llm["interface_format"],
            "max_tokens": self.llm["max_tokens"],
            "timeout": self.llm["timeout"],
        }

    def _embedding_core(self) -> Dict[str, Any]:
        """Common embedding kwargs accepted by funcs that read the vector store."""
        return {
            "embedding_api_key": self.embedding["embedding_api_key"],
            "embedding_url": self.embedding["embedding_url"],
            "embedding_interface_format": self.embedding["embedding_interface_format"],
            "embedding_model_name": self.embedding["embedding_model_name"],
        }

    # ------------------------------------------------------------------
    # Pipeline-specific kwargs builders
    # ------------------------------------------------------------------

    def architecture_kwargs(self) -> Dict[str, Any]:
        """Args for ``backend.novel_generator.Novel_architecture_generate``."""
        req = self.req
        return {
            **self._llm_core(),
            "llm_model": self.llm["llm_model"],
            "topic": req.topic,
            "genre": req.genre,
            "number_of_chapters": req.num_chapters,
            "word_number": req.word_number,
            "filepath": self.filepath,
            "user_guidance": req.user_guidance,
        }

    def blueprint_kwargs(self) -> Dict[str, Any]:
        """Args for ``backend.novel_generator.Chapter_blueprint_generate``."""
        req = self.req
        return {
            **self._llm_core(),
            "llm_model": self.llm["llm_model"],
            "filepath": self.filepath,
            "number_of_chapters": req.num_chapters,
            "user_guidance": req.user_guidance,
        }

    def chapter_kwargs(self, *, novel_number: int | None = None) -> Dict[str, Any]:
        """Args shared by ``build_chapter_prompt`` and ``generate_chapter_draft``."""
        req = self.req
        return {
            **self._llm_core(),
            **self._embedding_core(),
            "model_name": self.llm["llm_model"],
            "filepath": self.filepath,
            "novel_number": novel_number if novel_number is not None else req.chapter_num,
            "word_number": req.word_number,
            "user_guidance": req.user_guidance,
            "characters_involved": req.characters_involved,
            "key_items": req.key_items,
            "scene_location": req.scene_location,
            "time_constraint": req.time_constraint,
            "embedding_retrieval_k": self.embedding["embedding_retrieval_k"],
        }

    def finalize_kwargs(self, *, novel_number: int | None = None) -> Dict[str, Any]:
        """Args for ``backend.novel_generator.finalize_chapter``."""
        req = self.req
        return {
            **self._llm_core(),
            **self._embedding_core(),
            "novel_number": novel_number if novel_number is not None else req.chapter_num,
            "word_number": req.word_number,
            "model_name": self.llm["llm_model"],
            "filepath": self.filepath,
        }

    def enrich_kwargs(self, *, chapter_text: str, word_number: int | None = None) -> Dict[str, Any]:
        """Args for ``backend.novel_generator.enrich_chapter_text``."""
        return {
            **self._llm_core(),
            "model_name": self.llm["llm_model"],
            "chapter_text": chapter_text,
            "word_number": word_number if word_number is not None else self.req.word_number,
        }

    def consistency_kwargs(
        self,
        *,
        novel_setting: str,
        character_state: str,
        global_summary: str,
        plot_arcs: str,
        chapter_text: str,
    ) -> Dict[str, Any]:
        """Args for ``backend.consistency_checker.check_consistency``."""
        return {
            **self._llm_core(),
            "model_name": self.llm["llm_model"],
            "novel_setting": novel_setting,
            "character_state": character_state,
            "global_summary": global_summary,
            "plot_arcs": plot_arcs,
            "chapter_text": chapter_text,
        }

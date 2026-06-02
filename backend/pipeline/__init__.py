"""Pipeline glue layer.

Right now this only houses :class:`GenerationContext`, which absorbs the
"unpack req → 18 kwargs → pipeline" boilerplate that previously dominated the
generation router. As the underlying pipeline functions get cleaned up in
later phases, more orchestration logic will land here.
"""
from backend.pipeline.context import GenerationContext

__all__ = ["GenerationContext"]

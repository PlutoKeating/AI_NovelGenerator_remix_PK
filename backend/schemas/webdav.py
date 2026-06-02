"""WebDAV schemas."""
from __future__ import annotations

from typing import Any, Dict

from pydantic import BaseModel


class WebDAVRequest(BaseModel):
    webdav_config: Dict[str, Any]

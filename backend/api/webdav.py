"""WebDAV remote-config endpoints."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from backend.schemas.webdav import WebDAVRequest
from backend.services.webdav_service import backup_config, restore_config, test_connection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webdav", tags=["webdav"])


@router.post("/test")
async def test_webdav(req: WebDAVRequest):
    try:
        status = test_connection(req.webdav_config)
        if status not in (200, 207):
            raise HTTPException(status_code=400, detail=f"WebDAV returned {status}")
        return {"status": "success", "message": "WebDAV connected"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("WebDAV test failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/backup")
async def backup_webdav(req: WebDAVRequest):
    try:
        status = backup_config(req.webdav_config)
        if status not in (200, 201, 204):
            raise HTTPException(status_code=400, detail=f"WebDAV returned {status}")
        return {"status": "success", "message": "Backup completed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("WebDAV backup failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/restore")
async def restore_webdav(req: WebDAVRequest):
    try:
        status = restore_config(req.webdav_config)
        if status != 200:
            raise HTTPException(status_code=400, detail=f"WebDAV returned {status}")
        return {"status": "success", "message": "Restore completed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("WebDAV restore failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

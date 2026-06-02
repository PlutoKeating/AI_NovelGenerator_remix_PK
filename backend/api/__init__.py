"""API router package — each module exposes a ``router`` symbol that the
application factory (``backend.main.create_app``) mounts."""
from backend.api import (
    config as config_router,
    novels as novels_router,
    files as files_router,
    blueprint as blueprint_router,
    chapters as chapters_router,
    generation as generation_router,
    roles as roles_router,
    knowledge as knowledge_router,
    ai as ai_router,
    webdav as webdav_router,
    health as health_router,
    tasks as tasks_router,
)

ALL_ROUTERS = [
    config_router.router,
    novels_router.router,
    files_router.router,
    blueprint_router.router,
    chapters_router.router,
    generation_router.router,
    roles_router.router,
    knowledge_router.router,
    ai_router.router,
    webdav_router.router,
    health_router.router,
    tasks_router.router,
]

__all__ = ["ALL_ROUTERS"]

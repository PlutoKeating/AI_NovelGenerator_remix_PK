"""Phase 2 regression tests — verify router split keeps the public API intact.

Uses FastAPI's TestClient against the assembled app to ensure that every route
defined by the legacy monolith is still reachable, returns the same shapes,
and preserves back-compat re-exports on ``backend.main``.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


# ---------------------------------------------------------------------------
# Route inventory
# ---------------------------------------------------------------------------

EXPECTED_PATHS = {
    ("GET", "/api/health"),
    ("GET", "/api/config"),
    ("PUT", "/api/config"),
    ("POST", "/api/config/test-llm"),
    ("POST", "/api/config/test-embedding"),
    ("GET", "/api/novels"),
    ("POST", "/api/novels"),
    ("GET", "/api/novels/{novel_id}"),
    ("PUT", "/api/novels/{novel_id}"),
    ("DELETE", "/api/novels/{novel_id}"),
    ("GET", "/api/novels/{novel_id}/info"),
    ("POST", "/api/novels/{novel_id}/info"),
    ("GET", "/api/files/{name}"),
    ("PUT", "/api/files/{name}"),
    ("GET", "/api/files/chapters/{num}"),
    ("PUT", "/api/files/chapters/{num}"),
    ("GET", "/api/blueprint"),
    ("GET", "/api/chapters"),
    ("POST", "/api/generate/architecture"),
    ("POST", "/api/generate/blueprint"),
    ("POST", "/api/generate/prompt"),
    ("POST", "/api/generate/draft"),
    ("POST", "/api/generate/finalize"),
    ("POST", "/api/generate/enrich"),
    ("POST", "/api/generate/batch"),
    ("POST", "/api/generate/consistency"),
    ("GET", "/api/roles"),
    ("POST", "/api/roles"),
    ("DELETE", "/api/roles"),
    ("POST", "/api/roles/category"),
    ("POST", "/api/roles/analyze"),
    ("POST", "/api/knowledge/import"),
    ("DELETE", "/api/vectorstore"),
    ("POST", "/api/ai/chat"),
    ("POST", "/api/ai/chat/stream"),
    ("POST", "/api/ai/polish"),
    ("POST", "/api/webdav/test"),
    ("POST", "/api/webdav/backup"),
    ("POST", "/api/webdav/restore"),
}


def test_route_inventory_matches_legacy():
    actual = {(list(r.methods)[0], r.path) for r in app.routes if getattr(r, "methods", None)}
    api_actual = {pair for pair in actual if pair[1].startswith("/api/")}
    missing = EXPECTED_PATHS - api_actual
    assert not missing, f"Missing routes after Phase 2 split: {sorted(missing)}"


# ---------------------------------------------------------------------------
# End-to-end: novel CRUD round-trip via routers
# ---------------------------------------------------------------------------

def test_novel_crud_roundtrip(client: TestClient):
    # health
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"

    # create
    r = client.post("/api/novels", json={"title": "Phase2 Test", "genre": "scifi", "num_chapters": 3})
    assert r.status_code == 200
    novel = r.json()
    nid = novel["id"]
    assert novel["title"] == "Phase2 Test"
    assert novel["genre"] == "scifi"

    # list
    r = client.get("/api/novels")
    assert r.status_code == 200
    assert any(n["id"] == nid for n in r.json())

    # write a chapter via files router
    r = client.put(f"/api/files/chapters/1", json={"novel_path": nid, "content": "hello world\nLine 2"})
    assert r.status_code == 200

    # read it back
    r = client.get(f"/api/files/chapters/1", params={"novel_path": nid})
    assert r.status_code == 200
    assert r.text.startswith("hello world")

    # chapters listing
    r = client.get("/api/chapters", params={"novel_path": nid})
    assert r.status_code == 200
    chapters = r.json()
    assert len(chapters) == 1
    assert chapters[0]["number"] == "1"

    # info update + read
    r = client.post(f"/api/novels/{nid}/info", json={
        "background": "bg-text", "characters": "ch-text",
        "user_guidance": "", "key_items": "", "scene_location": "", "time_constraint": "",
    })
    assert r.status_code == 200
    r = client.get(f"/api/novels/{nid}/info")
    assert r.status_code == 200
    info = r.json()
    assert info["background"] == "bg-text"
    assert info["characters"] == "ch-text"

    # role CRUD
    r = client.post("/api/roles", json={
        "novel_path": nid, "category": "Main",
        "role": {"name": "Alice", "description": "protagonist"},
    })
    assert r.status_code == 200
    r = client.get("/api/roles", params={"novel_path": nid})
    assert r.status_code == 200
    cats = r.json()
    assert cats[0]["name"] == "Main"
    assert cats[0]["roles"][0]["name"] == "Alice"

    # delete novel
    r = client.delete(f"/api/novels/{nid}")
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Back-compat: legacy import surface
# ---------------------------------------------------------------------------

def test_legacy_imports_still_work():
    """Code that imported helpers from backend.main must keep working."""
    from backend.main import (  # noqa: F401
        AppConfig, ProviderConfig, GenerationRequest, NovelMetadata, ChatMessage,
        load_config_file, save_config_file, apply_proxy_settings,
        get_novel_dir, read_novel_file, write_novel_file, list_chapters,
        DATA_DIR, CONFIG_PATH, NOVELS_INDEX_PATH,
    )
    # And make sure config helpers behave as a pair.
    cfg = load_config_file()
    assert isinstance(cfg, dict)
    assert "providers" in cfg

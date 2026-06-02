"""Pytest fixtures — isolate DATA_DIR for the entire session.

Tests must NOT touch the developer's real ``./data`` directory. We point
``DATA_DIR`` at a temp directory **before pytest collects test modules** so
that ``backend.core.paths`` resolves to it even when test modules import
``backend.main`` at module load time.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path


# Ensure repo root is on sys.path so ``import backend`` works under pytest.
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


# ``pytest_configure`` runs BEFORE test collection, which is the only point
# where we can redirect DATA_DIR before the test files import backend modules.
def pytest_configure(config):  # noqa: D401  (pytest hook)
    tmp = tempfile.mkdtemp(prefix="aing_test_data_")
    os.environ["DATA_DIR"] = tmp
    # Defensive: if any backend module slipped into sys.modules earlier (e.g.
    # via plugins), drop them so the new DATA_DIR is honoured on first import.
    for mod in [m for m in list(sys.modules) if m == "backend" or m.startswith("backend.")]:
        sys.modules.pop(mod, None)

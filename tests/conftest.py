"""Windows compatibility for genlayer-test direct mode."""

import atexit
import os
from pathlib import Path
import tempfile


if os.name == "nt":
    _unlink = os.unlink
    _deferred_paths: list[str] = []
    _temp_dir = Path(tempfile.gettempdir()).resolve()

    def _defer_locked_temp_file(path, *args, **kwargs):
        try:
            _unlink(path, *args, **kwargs)
        except PermissionError:
            resolved = Path(path).resolve()
            if resolved.parent != _temp_dir or not resolved.name.startswith("tmp"):
                raise
            _deferred_paths.append(str(resolved))

    os.unlink = _defer_locked_temp_file

    @atexit.register
    def _remove_deferred_temp_files() -> None:
        for path in _deferred_paths:
            try:
                _unlink(path)
            except (FileNotFoundError, PermissionError):
                pass

import sys
import pytest

contract_file = Path(__file__).resolve().parent.parent / "contracts" / "chainsettle.py"

def _ensure_sdk_active() -> None:
    try:
        from gltest.direct.sdk_loader import setup_sdk_paths
        if "genlayer" in sys.modules:
            mod = sys.modules["genlayer"]
            # If genlayer was loaded from system site-packages instead of gltest-direct SDK cache
            mod_file = getattr(mod, "__file__", "") or ""
            if "gltest-direct" not in mod_file or not hasattr(mod, "gl"):
                sys.modules.pop("genlayer", None)
        if contract_file.exists():
            setup_sdk_paths(contract_file)
    except Exception:
        pass

_ensure_sdk_active()

@pytest.fixture(autouse=True)
def _maintain_genlayer_sdk():
    _ensure_sdk_active()
    yield
    _ensure_sdk_active()

def pytest_runtest_setup(item):
    _ensure_sdk_active()



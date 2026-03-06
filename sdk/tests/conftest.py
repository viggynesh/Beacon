import pytest

from beacon_sdk.emitter import reset_emitter


@pytest.fixture(autouse=True)
def _reset_emitter():
    """Reset the cached emitter before each test so env var changes take effect."""
    reset_emitter()
    yield
    reset_emitter()

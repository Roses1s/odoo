import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def isolated_cache(settings):
    """Throttling counters live in the cache.

    CI has no Redis service, and a shared cache would also carry request
    counts from one test into the next, so every test gets its own.
    """
    settings.CACHES = {
        "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
    }
    cache.clear()
    yield
    cache.clear()

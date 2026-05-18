import pytest


@pytest.fixture(autouse=True)
def _auto_clear():
  """Override the DB autouse fixture from root conftest for unit tests."""
  yield

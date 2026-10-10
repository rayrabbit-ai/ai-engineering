import pytest
from src.calculator import SafeMathEngine

@pytest.fixture
def engine():
    """Fixture reutilizable del motor de cálculo."""
    return SafeMathEngine()

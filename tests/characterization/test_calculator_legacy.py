import pytest
from src.calculator import SafeMathEngine

@pytest.mark.legacy_baseline
def test_golden_master_integer_operations(engine: SafeMathEngine):
    """
    @legacy-baseline
    Congela el comportamiento histórico del motor de cálculo.
    Inmutable: solo se modifica si existe una decisión de negocio formal.
    """
    assert engine.add(100, 250) == 350
    assert engine.subtract(100, 25) == 75
    assert engine.multiply(12, 12) == 144
    assert engine.divide(100, 4) == 25.0

@pytest.mark.legacy_baseline
def test_golden_master_division_by_zero_contract(engine: SafeMathEngine):
    assert engine.divide(50, 0) is None


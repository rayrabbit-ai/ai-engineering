import pytest
from src.calculator import SafeMathEngine

@pytest.mark.unit
def test_addition(engine: SafeMathEngine):
    assert engine.add(10, 5) == 15
    assert engine.add(-2, 3) == 1

@pytest.mark.unit
def test_subtraction(engine: SafeMathEngine):
    assert engine.subtract(10, 5) == 5
    assert engine.subtract(5, 10) == -5

@pytest.mark.unit
def test_multiplication(engine: SafeMathEngine):
    assert engine.multiply(4, 5) == 20
    assert engine.multiply(-2, 3) == -6

@pytest.mark.unit
def test_division(engine: SafeMathEngine):
    assert engine.divide(10, 2) == 5.0

@pytest.mark.unit
def test_division_by_zero_raises(engine: SafeMathEngine):
    with pytest.raises(ValueError, match="Division by zero is not allowed"):
        engine.divide(10, 0)

@pytest.mark.unit
def test_type_validation_raises(engine: SafeMathEngine):
    with pytest.raises(TypeError):
        engine.add("10", 5)  # type: ignore
    with pytest.raises(TypeError):
        engine.divide(10, True)  # type: ignore

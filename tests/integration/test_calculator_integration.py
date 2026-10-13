import pytest
from src.calculator import SafeMathEngine

@pytest.mark.integration
def test_expression_evaluation_with_operator_precedence(engine: SafeMathEngine):
    # Verifica la integración entre parser de tokens y evaluación aritmética
    result = engine.evaluate_simple("10 + 5 * 2")
    assert result == 20

@pytest.mark.integration
def test_expression_evaluation_subtraction_and_addition(engine: SafeMathEngine):
    result = engine.evaluate_simple("100 - 20 + 5")
    assert result == 85

@pytest.mark.integration
def test_expression_evaluation_power_and_modulo(engine: SafeMathEngine):
    assert engine.evaluate_simple("2 ^ 3 + 10 % 3") == 9
    assert engine.evaluate_simple("10 + 20 / 4 - 3 ^ 2") == 6
    assert engine.evaluate_simple("15 % 4 * 2 ^ 3") == 24

@pytest.mark.integration
def test_expression_evaluation_negative_powers(engine: SafeMathEngine):
    assert engine.evaluate_simple("2 ^ -2") == 0.25
    assert engine.evaluate_simple("2 ^ -1 + 0.5") == 1
    assert engine.evaluate_simple("0 ^ -2") is None

@pytest.mark.integration
def test_expression_evaluation_division_or_modulo_by_zero_returns_none(engine: SafeMathEngine):
    assert engine.evaluate_simple("10 / 0") is None
    assert engine.evaluate_simple("10 % 0") is None

@pytest.mark.integration
def test_invalid_expression_raises_value_error(engine: SafeMathEngine):
    with pytest.raises(ValueError):
        engine.evaluate_simple("10 + * 5")
    with pytest.raises(ValueError):
        engine.evaluate_simple("")


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
def test_invalid_expression_raises_value_error(engine: SafeMathEngine):
    with pytest.raises(ValueError):
        engine.evaluate_simple("10 + * 5")
    with pytest.raises(ValueError):
        engine.evaluate_simple("")

import pytest
from src.calculator import SafeMathEngine

@pytest.mark.e2e
def test_full_mathematical_workflow_pipeline(engine: SafeMathEngine):
    """
    Prueba de ciclo completo simulando una tubería de evaluación de datos en vivo.
    """
    pipeline_inputs = [
        ("10 + 20", 30),
        ("50 - 15 * 2", 20),
        ("100 * 2 + 50", 250),
        ("2 ^ 3 + 10 % 3", 9),
        ("100 / 4 - 2 ^ 4", 9),
        ("10 / 0", None),
    ]


    for expr, expected in pipeline_inputs:
        result = engine.evaluate_simple(expr)
        assert result == expected, f"Fallo en pipeline E2E para expresión '{expr}'"

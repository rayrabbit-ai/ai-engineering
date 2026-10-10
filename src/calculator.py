"""
Módulo de cálculo matemático determinista (RayRabbit AI Engineering).
"""

from typing import Union

Number = Union[int, float]

class SafeMathEngine:
    """Motor de cálculo con validación de tipos y manejo estricto de errores."""

    def add(self, a: Number, b: Number) -> Number:
        self._validate_number(a, b)
        return a + b

    def subtract(self, a: Number, b: Number) -> Number:
        self._validate_number(a, b)
        return a - b

    def multiply(self, a: Number, b: Number) -> Number:
        self._validate_number(a, b)
        return a * b

    def divide(self, a: Number, b: Number) -> float:
        self._validate_number(a, b)
        if b == 0:
            raise ValueError("Division by zero is not allowed")
        return a / b

    def evaluate_simple(self, expr: str) -> Number:
        """
        Evalúa expresiones aritméticas básicas (+, -, *) de forma segura
        sin recurrir a eval() inseguro.
        """
        if not isinstance(expr, str) or not expr.strip():
            raise ValueError("Expression must be a non-empty string")

        tokens = expr.replace("+", " + ").replace("-", " - ").replace("*", " * ").split()
        if not tokens:
            raise ValueError("Empty expression")

        # Parser simple de precedencia
        # Fase 1: Multiplicaciones
        i = 0
        reduced_tokens: list[Union[Number, str]] = []
        while i < len(tokens):
            token = tokens[i]
            if token == "*":
                if not reduced_tokens or i + 1 >= len(tokens):
                    raise ValueError("Malformed multiplication syntax")
                prev = reduced_tokens.pop()
                nxt = self._parse_num(tokens[i + 1])
                reduced_tokens.append(float(prev) * nxt)
                i += 2
            else:
                if token in ("+", "-"):
                    reduced_tokens.append(token)
                else:
                    reduced_tokens.append(self._parse_num(token))
                i += 1

        # Fase 2: Sumas y Restas
        if not reduced_tokens:
            raise ValueError("Empty token list")

        result = float(reduced_tokens[0])
        idx = 1
        while idx < len(reduced_tokens):
            op = reduced_tokens[idx]
            val = float(reduced_tokens[idx + 1])
            if op == "+":
                result += val
            elif op == "-":
                result -= val
            else:
                raise ValueError(f"Unknown operator: {op}")
            idx += 2

        return int(result) if result.is_integer() else result

    def _validate_number(self, *args: Number) -> None:
        for val in args:
            if not isinstance(val, (int, float)) or isinstance(val, bool):
                raise TypeError(f"Expected int or float, got {type(val).__name__}")

    def _parse_num(self, token: str) -> Number:
        try:
            val = float(token)
            return int(val) if val.is_integer() else val
        except ValueError:
            raise ValueError(f"Invalid numeric token: {token}")

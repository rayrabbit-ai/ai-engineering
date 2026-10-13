"""
Módulo de cálculo matemático determinista (RayRabbit AI Engineering).
"""

from typing import Union, Optional

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

    def divide(self, a: Number, b: Number) -> Optional[float]:
        self._validate_number(a, b)
        if b == 0:
            return None
        return a / b

    def modulo(self, a: Number, b: Number) -> Optional[Number]:
        self._validate_number(a, b)
        if b == 0:
            return None
        return a % b

    def mod(self, a: Number, b: Number) -> Optional[Number]:
        return self.modulo(a, b)

    def power(self, a: Number, b: Number) -> Optional[Number]:
        self._validate_number(a, b)
        if a == 0 and b < 0:
            return None
        res = a ** b
        return int(res) if isinstance(res, float) and res.is_integer() else res

    def pow(self, a: Number, b: Number) -> Optional[Number]:
        return self.power(a, b)


    def evaluate_simple(self, expr: str) -> Optional[Number]:
        """Evalúa expresiones aritméticas (+, -, *, /, %, ^) deterministamente."""
        tokens = self._tokenize(expr)
        after_powers = self._reduce_powers(tokens)
        if after_powers is None:
            return None
        after_mult_div = self._reduce_mult_div(after_powers)
        if after_mult_div is None:
            return None
        return self._reduce_add_sub(after_mult_div)

    def _tokenize(self, expr: str) -> list[str]:
        if not isinstance(expr, str) or not expr.strip():
            raise ValueError("Expression must be a non-empty string")
        spaced = expr.replace("^", " ^ ").replace("*", " * ").replace("/", " / ")
        spaced = spaced.replace("%", " % ").replace("+", " + ").replace("-", " - ")
        tokens = spaced.split()
        if not tokens:
            raise ValueError("Empty expression")
        return tokens

    def _reduce_powers(self, tokens: list[str]) -> Optional[list[Union[Number, str]]]:
        reduced: list[Union[Number, str]] = []
        i = 0
        while i < len(tokens):
            token = tokens[i]
            if token == "^":
                if not reduced or i + 1 >= len(tokens):
                    raise ValueError("Malformed power syntax")
                prev = reduced.pop()
                if not isinstance(prev, (int, float)):
                    raise ValueError("Malformed power syntax")
                consumed = 1
                if tokens[i + 1] == "-" and i + 2 < len(tokens):
                    nxt = -self._parse_num(tokens[i + 2])
                    consumed = 2
                elif tokens[i + 1] == "+" and i + 2 < len(tokens):
                    nxt = self._parse_num(tokens[i + 2])
                    consumed = 2
                else:
                    nxt = self._parse_num(tokens[i + 1])
                res = self.power(prev, nxt)
                if res is None:
                    return None
                reduced.append(res)
                i += 1 + consumed
            elif token in ("*", "/", "%", "+", "-"):
                reduced.append(token)
                i += 1
            else:
                reduced.append(self._parse_num(token))
                i += 1
        return reduced

    def _reduce_mult_div(
        self, tokens: list[Union[Number, str]]
    ) -> Optional[list[Union[Number, str]]]:
        reduced: list[Union[Number, str]] = []
        i = 0
        while i < len(tokens):
            token = tokens[i]
            if token in ("*", "/", "%"):
                if not reduced or i + 1 >= len(tokens):
                    raise ValueError(f"Malformed {token} syntax")
                prev = reduced.pop()
                if not isinstance(prev, (int, float)):
                    raise ValueError(f"Malformed {token} syntax")
                consumed = 1
                if tokens[i + 1] == "-" and i + 2 < len(tokens):
                    nxt_token = tokens[i + 2]
                    nxt_val = (
                        nxt_token
                        if isinstance(nxt_token, (int, float))
                        else self._parse_num(str(nxt_token))
                    )
                    nxt = -nxt_val
                    consumed = 2
                elif tokens[i + 1] == "+" and i + 2 < len(tokens):
                    nxt_token = tokens[i + 2]
                    nxt = (
                        nxt_token
                        if isinstance(nxt_token, (int, float))
                        else self._parse_num(str(nxt_token))
                    )
                    consumed = 2
                else:
                    nxt_token = tokens[i + 1]
                    nxt = (
                        nxt_token
                        if isinstance(nxt_token, (int, float))
                        else self._parse_num(str(nxt_token))
                    )
                res = self._apply_mult_div_op(token, prev, nxt)
                if res is None:
                    return None
                reduced.append(res)
                i += 1 + consumed
            else:
                reduced.append(token)
                i += 1
        return reduced

    def _apply_mult_div_op(self, op: str, a: Number, b: Number) -> Optional[Number]:
        if op == "*":
            return self.multiply(a, b)
        if op == "/":
            return self.divide(a, b)
        return self.modulo(a, b)

    def _reduce_add_sub(self, tokens: list[Union[Number, str]]) -> Number:
        if not tokens:
            raise ValueError("Empty token list")
        result = tokens[0]
        if not isinstance(result, (int, float)):
            raise ValueError("Malformed expression syntax")
        result = float(result)
        idx = 1
        while idx < len(tokens):
            op = tokens[idx]
            val = float(tokens[idx + 1])
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

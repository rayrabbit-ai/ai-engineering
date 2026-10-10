/**
 * Motor de cálculo determinista y seguro (TypeScript / Node.js).
 * RayRabbit AI Engineering Standard
 */

export type MathNumber = number;

export class SafeMathEngine {
  add(a: MathNumber, b: MathNumber): MathNumber {
    this.validateNumber(a, b);
    return a + b;
  }

  subtract(a: MathNumber, b: MathNumber): MathNumber {
    this.validateNumber(a, b);
    return a - b;
  }

  multiply(a: MathNumber, b: MathNumber): MathNumber {
    this.validateNumber(a, b);
    return a * b;
  }

  divide(a: MathNumber, b: MathNumber): MathNumber | null {
    this.validateNumber(a, b);
    if (b === 0) {
      return null;
    }
    return a / b;
  }

  modulo(a: MathNumber, b: MathNumber): MathNumber | null {
    this.validateNumber(a, b);
    if (b === 0) {
      return null;
    }
    return a % b;
  }

  mod(a: MathNumber, b: MathNumber): MathNumber | null {
    return this.modulo(a, b);
  }

  power(a: MathNumber, b: MathNumber): MathNumber {
    this.validateNumber(a, b);
    return Math.pow(a, b);
  }

  pow(a: MathNumber, b: MathNumber): MathNumber {
    return this.power(a, b);
  }


  evaluateSimple(expr: string): MathNumber {
    if (typeof expr !== 'string' || !expr.trim()) {
      throw new Error('Expression must be a non-empty string');
    }

    const tokens = expr.replace(/\+/g, ' + ').replace(/-/g, ' - ').replace(/\*/g, ' * ').trim().split(/\s+/);
    if (tokens.length === 0) {
      throw new Error('Empty expression');
    }

    // Fase 1: Multiplicaciones
    const reducedTokens: Array<MathNumber | string> = [];
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token === '*') {
        if (reducedTokens.length === 0 || i + 1 >= tokens.length) {
          throw new Error('Malformed multiplication syntax');
        }
        const prev = reducedTokens.pop() as MathNumber;
        const nxt = this.parseNum(tokens[i + 1]);
        reducedTokens.push(prev * nxt);
        i += 2;
      } else if (token === '+' || token === '-') {
        reducedTokens.push(token);
        i += 1;
      } else {
        reducedTokens.push(this.parseNum(token));
        i += 1;
      }
    }

    // Fase 2: Sumas y restas
    let result = reducedTokens[0] as MathNumber;
    let idx = 1;
    while (idx < reducedTokens.length) {
      const op = reducedTokens[idx];
      const val = reducedTokens[idx + 1] as MathNumber;
      if (op === '+') {
        result += val;
      } else if (op === '-') {
        result -= val;
      } else {
        throw new Error(`Unknown operator: ${op}`);
      }
      idx += 2;
    }

    return result;
  }

  private validateNumber(...args: MathNumber[]): void {
    for (const val of args) {
      if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
        throw new TypeError(`Expected a valid finite number, got ${typeof val}`);
      }
    }
  }

  private parseNum(token: string): MathNumber {
    const val = Number(token);
    if (Number.isNaN(val)) {
      throw new Error(`Invalid numeric token: ${token}`);
    }
    return val;
  }
}

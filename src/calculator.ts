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


  evaluateSimple(expr: string): MathNumber | null {
    const tokens = this.tokenize(expr);
    const afterPowers = this.reducePowers(tokens);
    const afterMultDiv = this.reduceMultDiv(afterPowers);
    if (afterMultDiv === null) {
      return null;
    }
    return this.reduceAddSub(afterMultDiv);
  }

  private tokenize(expr: string): string[] {
    if (typeof expr !== 'string' || !expr.trim()) {
      throw new Error('Expression must be a non-empty string');
    }
    const spaced = expr
      .replace(/\^/g, ' ^ ')
      .replace(/\*/g, ' * ')
      .replace(/\//g, ' / ')
      .replace(/%/g, ' % ')
      .replace(/\+/g, ' + ')
      .replace(/-/g, ' - ');
    const tokens = spaced.trim().split(/\s+/);
    if (tokens.length === 0 || tokens[0] === '') {
      throw new Error('Empty expression');
    }
    return tokens;
  }

  private reducePowers(tokens: string[]): Array<MathNumber | string> {
    const reduced: Array<MathNumber | string> = [];
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token === '^') {
        if (reduced.length === 0 || i + 1 >= tokens.length) {
          throw new Error('Malformed power syntax');
        }
        const prev = reduced.pop();
        if (typeof prev !== 'number') throw new Error('Malformed power syntax');
        const nxt = this.parseNum(tokens[i + 1]);
        reduced.push(this.power(prev, nxt));
        i += 2;
      } else if (['*', '/', '%', '+', '-'].includes(token)) {
        reduced.push(token);
        i += 1;
      } else {
        reduced.push(this.parseNum(token));
        i += 1;
      }
    }
    return reduced;
  }

  private reduceMultDiv(tokens: Array<MathNumber | string>): Array<MathNumber | string> | null {
    const reduced: Array<MathNumber | string> = [];
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token === '*' || token === '/' || token === '%') {
        if (reduced.length === 0 || i + 1 >= tokens.length) {
          throw new Error(`Malformed ${token} syntax`);
        }
        const prev = reduced.pop();
        if (typeof prev !== 'number') throw new Error(`Malformed ${token} syntax`);
        const nxtToken = tokens[i + 1];
        const nxt = typeof nxtToken === 'number' ? nxtToken : this.parseNum(nxtToken);
        const res = this.applyOp(token, prev, nxt);
        if (res === null) return null;
        reduced.push(res);
        i += 2;
      } else {
        reduced.push(token);
        i += 1;
      }
    }
    return reduced;
  }

  private applyOp(op: string, a: MathNumber, b: MathNumber): MathNumber | null {
    if (op === '*') return this.multiply(a, b);
    if (op === '/') return this.divide(a, b);
    return this.modulo(a, b);
  }

  private reduceAddSub(tokens: Array<MathNumber | string>): MathNumber {
    if (tokens.length === 0) throw new Error('Empty expression');
    let result = tokens[0];
    if (typeof result !== 'number') throw new Error('Malformed expression syntax');
    let idx = 1;
    while (idx < tokens.length) {
      const op = tokens[idx];
      const val = tokens[idx + 1];
      if (typeof val !== 'number') throw new Error('Malformed expression syntax');
      if (op === '+') result = this.add(result, val);
      else if (op === '-') result = this.subtract(result, val);
      else throw new Error(`Unknown operator: ${op}`);
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

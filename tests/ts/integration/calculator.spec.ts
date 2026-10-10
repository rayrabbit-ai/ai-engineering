import { describe, it, expect, beforeEach } from 'vitest';
import { SafeMathEngine } from '../../../src/calculator.js';

describe('SafeMathEngine Integration Tests', () => {
  let engine: SafeMathEngine;

  beforeEach(() => {
    engine = new SafeMathEngine();
  });

  it('debe evaluar expresiones con precedencia de operadores (* antes que + y -)', () => {
    expect(engine.evaluateSimple('10 + 5 * 2')).toBe(20);
    expect(engine.evaluateSimple('50 - 10 * 3 + 5')).toBe(25);
  });

  it('debe evaluar operaciones encadenadas sin precedencia', () => {
    expect(engine.evaluateSimple('100 - 30 + 15')).toBe(85);
  });

  it('debe arrojar error ante sintaxis mal formada', () => {
    expect(() => engine.evaluateSimple('10 + * 5')).toThrow();
    expect(() => engine.evaluateSimple('')).toThrow('Expression must be a non-empty string');
  });
});

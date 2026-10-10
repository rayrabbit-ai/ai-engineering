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

  it('debe evaluar expresiones con precedencia de potencia y módulo', () => {
    expect(engine.evaluateSimple('2 ^ 3 + 10 % 3')).toBe(9);
    expect(engine.evaluateSimple('10 + 20 / 4 - 3 ^ 2')).toBe(6);
    expect(engine.evaluateSimple('15 % 4 * 2 ^ 3')).toBe(24);
  });

  it('debe retornar null en expresiones con división o módulo por cero', () => {
    expect(engine.evaluateSimple('10 / 0')).toBeNull();
    expect(engine.evaluateSimple('10 % 0')).toBeNull();
  });

  it('debe arrojar error ante sintaxis mal formada', () => {
    expect(() => engine.evaluateSimple('10 + * 5')).toThrow();
    expect(() => engine.evaluateSimple('')).toThrow('Expression must be a non-empty string');
  });
});


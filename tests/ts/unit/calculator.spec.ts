import { describe, it, expect, beforeEach } from 'vitest';
import { SafeMathEngine } from '../../../src/calculator.js';

describe('SafeMathEngine Unit Tests', () => {
  let engine: SafeMathEngine;

  beforeEach(() => {
    engine = new SafeMathEngine();
  });

  it('debe sumar números correctamente', () => {
    expect(engine.add(10, 5)).toBe(15);
    expect(engine.add(-3, 8)).toBe(5);
  });

  it('debe restar números correctamente', () => {
    expect(engine.subtract(10, 4)).toBe(6);
    expect(engine.subtract(4, 10)).toBe(-6);
  });

  it('debe multiplicar números correctamente', () => {
    expect(engine.multiply(3, 7)).toBe(21);
    expect(engine.multiply(-2, 4)).toBe(-8);
  });

  it('debe dividir números correctamente', () => {
    expect(engine.divide(20, 4)).toBe(5);
  });

  it('debe arrojar error ante división por cero', () => {
    expect(() => engine.divide(10, 0)).toThrow('Division by zero is not allowed');
  });

  it('debe validar tipos estrictamente', () => {
    // @ts-expect-error probando paso de argumento inválido en runtime
    expect(() => engine.add('10', 5)).toThrow(TypeError);
    // @ts-expect-error probando valor NaN
    expect(() => engine.multiply(NaN, 5)).toThrow(TypeError);
  });
});

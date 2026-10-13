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

  it('debe devolver null ante división por cero', () => {
    expect(engine.divide(10, 0)).toBeNull();
  });

  it('debe calcular módulo correctamente', () => {
    expect(engine.modulo(10, 3)).toBe(1);
    expect(engine.modulo(20, 6)).toBe(2);
    expect(engine.mod(10, 3)).toBe(1);
  });

  it('debe devolver null ante módulo por cero', () => {
    expect(engine.modulo(10, 0)).toBeNull();
  });

  it('debe calcular potencias correctamente', () => {
    expect(engine.power(2, 3)).toBe(8);
    expect(engine.power(5, 0)).toBe(1);
    expect(engine.power(3, 2)).toBe(9);
    expect(engine.pow(2, 3)).toBe(8);
  });

  it('debe calcular potencias con exponentes negativos', () => {
    expect(engine.power(2, -2)).toBe(0.25);
    expect(engine.power(2, -1)).toBe(0.5);
    expect(engine.power(10, -2)).toBe(0.01);
    expect(engine.power(-2, -3)).toBe(-0.125);
    expect(engine.pow(2, -2)).toBe(0.25);
  });

  it('debe retornar null ante base 0 con exponente negativo', () => {
    expect(engine.power(0, -1)).toBeNull();
    expect(engine.power(0, -2)).toBeNull();
  });

  it('debe validar tipos estrictamente', () => {
    // @ts-expect-error probando paso de argumento inválido en runtime
    expect(() => engine.add('10', 5)).toThrow(TypeError);
    // @ts-expect-error probando valor NaN
    expect(() => engine.multiply(NaN, 5)).toThrow(TypeError);
    // @ts-expect-error probando paso de argumento inválido en modulo
    expect(() => engine.modulo('10', 3)).toThrow(TypeError);
    // @ts-expect-error probando paso de argumento inválido en power
    expect(() => engine.power('2', 3)).toThrow(TypeError);
  });
});


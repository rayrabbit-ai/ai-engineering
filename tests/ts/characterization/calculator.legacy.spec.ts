import { describe, it, expect } from 'vitest';
import { SafeMathEngine } from '../../../src/calculator.js';

/**
 * @legacy-baseline
 * Suite de caracterización inmutable. Congela el comportamiento observable
 * del motor de cálculo para asegurar que refactors o nuevas features no
 * introduzcan regresiones silenciosas (Legacy-Guard).
 */
describe('@legacy-baseline: SafeMathEngine Characterization', () => {
  const engine = new SafeMathEngine();

  it('golden-master: operaciones fundamentales conservan precisión entera', () => {
    expect(engine.add(100, 250)).toBe(350);
    expect(engine.subtract(100, 25)).toBe(75);
    expect(engine.multiply(12, 12)).toBe(144);
    expect(engine.divide(100, 4)).toBe(25);
  });

  it('golden-master: manejo determinista de decimales flotantes', () => {
    expect(engine.add(0.1, 0.2)).toBeCloseTo(0.3, 5);
  });

  it('golden-master: contrato de división por cero retorna null', () => {
    expect(engine.divide(50, 0)).toBeNull();
  });
});

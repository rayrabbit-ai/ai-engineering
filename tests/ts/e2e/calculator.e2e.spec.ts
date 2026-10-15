import { describe, it, expect } from 'vitest';
import { SafeMathEngine } from '../../../src/calculator.js';

describe('E2E Real Runtime Mathematical Pipeline (TypeScript)', () => {
  it('executes full mathematical workflow pipeline deterministically', () => {
    const engine = new SafeMathEngine();
    const pipelineInputs: Array<[string, number | null]> = [
      ['10 + 20', 30],
      ['50 - 15 * 2', 20],
      ['100 * 2 + 50', 250],
      ['2 ^ 3 + 10 % 3', 9],
      ['100 / 4 - 2 ^ 4', 9],
      ['10 / 0', null],
    ];

    for (const [expr, expected] of pipelineInputs) {
      const result = engine.evaluateSimple(expr);
      expect(result).toBe(expected);
    }
  });
});

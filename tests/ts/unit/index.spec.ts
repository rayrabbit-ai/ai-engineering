import { describe, it, expect } from 'vitest';
import { SafeMathEngine } from '../../../src/index.js';

describe('index entrypoint (TypeScript)', () => {
  it('correctly exports SafeMathEngine class', () => {
    const engine = new SafeMathEngine();
    expect(engine).toBeInstanceOf(SafeMathEngine);
    expect(engine.add(10, 20)).toBe(30);
  });
});

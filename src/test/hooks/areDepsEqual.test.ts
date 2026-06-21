import { describe, expect, it } from 'vitest';
import { areDepsEqual } from '../../main/hooks/index.js';

describe('areDepsEqual', () => {
  it('returns true when both dep lists are undefined', () => {
    expect(areDepsEqual(undefined, undefined)).toBe(true);
  });

  it('returns false when left side is undefined and right is an array', () => {
    expect(areDepsEqual(undefined, [1])).toBe(false);
  });

  it('returns false when left side is an array and right is undefined', () => {
    expect(areDepsEqual([1], undefined)).toBe(false);
  });

  it('returns true for empty arrays', () => {
    expect(areDepsEqual([], [])).toBe(true);
  });

  it('returns true for arrays with identical primitive values', () => {
    expect(areDepsEqual([1, 'a', true], [1, 'a', true])).toBe(true);
  });

  it('returns false when values differ', () => {
    expect(areDepsEqual([1], [2])).toBe(false);
  });

  it('returns false for arrays of different lengths', () => {
    expect(areDepsEqual([1, 2], [1])).toBe(false);
  });

  it('uses reference equality for objects', () => {
    const obj = {};
    expect(areDepsEqual([obj], [obj])).toBe(true);
    expect(areDepsEqual([{}], [{}])).toBe(false);
  });
});

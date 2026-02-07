import { shallowEqual } from '@simpreact/shared';
import { describe, expect, it } from 'vitest';

describe('shallowEqual', () => {
  describe('objects', () => {
    it('returns false if either argument is not an object', () => {
      expect(shallowEqual(null, {})).toBe(false);
      expect(shallowEqual({}, null)).toBe(false);
      expect(shallowEqual(42, {})).toBe(false);
      expect(shallowEqual({}, 'string')).toBe(false);
      expect(shallowEqual(undefined, undefined)).toBe(true);
    });

    it('returns true for the same object reference', () => {
      const obj = { a: 1 };
      expect(shallowEqual(obj, obj)).toBe(true);
    });

    it('returns true when both objects have the same keys and identical values', () => {
      const objA = { a: 1, b: 'test', c: true };
      const objB = { a: 1, b: 'test', c: true };
      expect(shallowEqual(objA, objB)).toBe(true);
    });

    it('returns false when one object has extra keys', () => {
      expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    });

    it('returns false when a value differs', () => {
      expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('returns true for identical references in values', () => {
      const objRef = { nested: 1 };
      const a = { ref: objRef };
      const b = { ref: objRef };
      expect(shallowEqual(a, b)).toBe(true);
    });

    it('returns false for different object references with same structure', () => {
      expect(shallowEqual({ ref: { x: 1 } }, { ref: { x: 1 } })).toBe(false);
    });

    it('handles Object.is semantics correctly (NaN and -0/+0)', () => {
      expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
      expect(shallowEqual({ a: -0 }, { a: +0 })).toBe(false);
    });

    it('returns true for empty objects', () => {
      expect(shallowEqual({}, {})).toBe(true);
    });

    it('returns false if second object is missing a property even with undefined value', () => {
      expect(shallowEqual({ a: undefined }, {})).toBe(false);
    });

    it('returns true if both objects have undefined properties explicitly', () => {
      expect(shallowEqual({ a: undefined }, { a: undefined })).toBe(true);
    });

    it('returns false when property exists in objA but not in objB', () => {
      expect(shallowEqual({ a: 1 }, Object.create({ a: 1 }))).toBe(false);
    });

    it('returns true when both have same symbols as keys and identical values', () => {
      const sym = Symbol('x');
      const a = { [sym]: 1 };
      const b = { [sym]: 1 };
      expect(shallowEqual(a, b)).toBe(true);
    });

    it('returns false when symbol keys differ', () => {
      const a = { [Symbol('x')]: 1 };
      const b = { [Symbol('x')]: 1 };
      expect(shallowEqual(a, b)).toBe(false);
    });
  });

  describe('arrays', () => {
    it('returns true for the same array reference', () => {
      const arr = [1, 2, 3];
      expect(shallowEqual(arr, arr)).toBe(true);
    });

    it('returns true for identical contents', () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it('returns false for arrays of different lengths', () => {
      expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it('returns true for arrays used as property values with same reference', () => {
      const shared = [1, 2];
      expect(shallowEqual({ arr: shared }, { arr: shared })).toBe(true);
    });

    it('returns false for arrays used as property values with different references', () => {
      expect(shallowEqual({ arr: [1, 2] }, { arr: [1, 2] })).toBe(false);
    });

    it('returns true for nested arrays with same reference', () => {
      const nested = [1, [2]];
      expect(shallowEqual({ a: nested }, { a: nested })).toBe(true);
    });

    it('returns false for nested arrays with different references but same structure', () => {
      expect(shallowEqual({ a: [1, [2]] }, { a: [1, [2]] })).toBe(false);
    });

    it('handles Object.is semantics correctly inside arrays', () => {
      expect(shallowEqual({ a: [NaN] }, { a: [NaN] })).toBe(false); // different array refs
      const arr = [NaN];
      expect(shallowEqual(arr, arr)).toBe(true); // same reference
      expect(shallowEqual([-0], [+0])).toBe(false);
    });
  });
});

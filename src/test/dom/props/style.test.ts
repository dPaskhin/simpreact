import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patchStyle } from '../../../main/dom/props/style.js';

describe('patchStyle', () => {
  let dom: HTMLDivElement;

  beforeEach(() => {
    dom = document.createElement('div');
  });

  describe('null / undefined next value', () => {
    it('removes the style attribute when next is null', () => {
      dom.setAttribute('style', 'color: red');
      patchStyle(null, null, dom);
      expect(dom.getAttribute('style')).toBeNull();
    });

    it('removes the style attribute when next is undefined', () => {
      dom.setAttribute('style', 'color: red');
      patchStyle(null, undefined, dom);
      expect(dom.getAttribute('style')).toBeNull();
    });
  });

  describe('string next value', () => {
    it('assigns cssText directly', () => {
      patchStyle(null, 'color: red; font-size: 16px', dom);
      expect(dom.style.color).toBe('red');
      expect(dom.style.fontSize).toBe('16px');
    });

    it('replaces existing cssText', () => {
      dom.style.cssText = 'color: red';
      patchStyle('color: red', 'color: blue', dom);
      expect(dom.style.color).toBe('blue');
    });
  });

  describe('object next value, no previous', () => {
    it('sets all properties via setProperty', () => {
      patchStyle(null, { backgroundColor: 'red', fontSize: '16px' }, dom);
      expect(dom.style.getPropertyValue('background-color')).toBe('red');
      expect(dom.style.getPropertyValue('font-size')).toBe('16px');
    });

    it('converts camelCase to kebab-case', () => {
      patchStyle(null, { borderTopColor: 'green' }, dom);
      expect(dom.style.getPropertyValue('border-top-color')).toBe('green');
    });

    it('handles multiple uppercase letters', () => {
      patchStyle(null, { marginBlockStart: '4px' }, dom);
      expect(dom.style.getPropertyValue('margin-block-start')).toBe('4px');
    });
  });

  describe('object next value, object previous', () => {
    it('updates only changed properties', () => {
      const setProperty = vi.spyOn(dom.style, 'setProperty');
      patchStyle({ color: 'red', fontSize: '16px' }, { color: 'blue', fontSize: '16px' }, dom);
      const calls = setProperty.mock.calls.map(c => c[0]);
      expect(calls).toContain('color');
      expect(calls).not.toContain('font-size');
    });

    it('removes properties absent in next', () => {
      dom.style.setProperty('font-size', '16px');
      patchStyle({ color: 'red', fontSize: '16px' }, { color: 'red' }, dom);
      expect(dom.style.getPropertyValue('font-size')).toBe('');
    });

    it('does not call setProperty for identical values', () => {
      dom.style.setProperty('color', 'red');
      const spy = vi.spyOn(dom.style, 'setProperty');
      patchStyle({ color: 'red' }, { color: 'red' }, dom);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('object next value, string previous (treated as no-prev)', () => {
    it('sets all properties from next object', () => {
      dom.style.cssText = 'color: red';
      patchStyle('color: red', { backgroundColor: 'blue' }, dom);
      expect(dom.style.getPropertyValue('background-color')).toBe('blue');
    });
  });
});

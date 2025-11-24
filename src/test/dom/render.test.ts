import { createRoot, render } from '@simpreact/dom';
import { createElement, provideHostAdapter, SimpElementFlag } from '@simpreact/internal';
import { Element } from 'flyweight-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { testHostAdapter } from '../test-host-adapter.js';

provideHostAdapter(testHostAdapter);

describe('render', () => {
  describe('render', () => {
    let container: Element;

    beforeEach(() => {
      container = new Element('div');
    });

    it('should mount a new root element if none exists', () => {
      const element = createElement('div');

      render(element, container as any);

      expect(testHostAdapter.clearNode).toHaveBeenCalledWith(container);
      expect((container as any).__SIMP_ELEMENT__.flag).toBe(SimpElementFlag.HOST);
      expect((container as any).__SIMP_ELEMENT__.children).toBe(element);
    });

    it('should patch existing root if new element is provided', () => {
      const initial = createElement('div');
      const next = createElement('section');

      render(initial, container as any);
      render(next, container as any);

      expect((container as any).__SIMP_ELEMENT__.flag).toBe(SimpElementFlag.HOST);
      expect((container as any).__SIMP_ELEMENT__.children).toBe(next);
    });

    it('should remove root element children if null element is passed', () => {
      const existing = createElement('div');

      render(existing, container as any);
      render(null, container as any);

      expect((container as any).__SIMP_ELEMENT__.children).toBe(null);
    });

    it('should do nothing if both root and new element are null', () => {
      render(null, container as any);
    });
  });

  describe('createRoot', () => {
    let container: Element;

    beforeEach(() => {
      container = new Element('div');
    });

    it('should mount new root element', () => {
      const root = createRoot(container as any);
      const element = createElement('div');

      root.render(element);

      expect((container as any).__SIMP_ELEMENT__.flag).toBe(SimpElementFlag.HOST);
      expect((container as any).__SIMP_ELEMENT__.children).toBe(element);
    });

    it('should patch existing root if present', () => {
      const root = createRoot(container as any);
      const first = createElement('div');
      const second = createElement('section');

      root.render(first);
      root.render(second);

      expect((container as any).__SIMP_ELEMENT__.flag).toBe(SimpElementFlag.HOST);
      expect((container as any).__SIMP_ELEMENT__.children).toBe(second);
    });

    it('should unmount the root element', () => {
      const root = createRoot(container as any);
      const element = createElement('div');

      root.render(element);
      root.unmount();

      expect((container as any).__SIMP_ELEMENT__.flag).toBe(SimpElementFlag.HOST);
      expect((container as any).__SIMP_ELEMENT__.children).toBe(null);
    });
  });
});

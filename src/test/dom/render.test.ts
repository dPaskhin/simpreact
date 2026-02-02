import { createCreateRoot, createRenderer } from '@simpreact/dom';
import { createElement, SIMP_ELEMENT_FLAG_HOST, type SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { testHostAdapter } from '../test-host-adapter.js';

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
};

const createRoot = createCreateRoot(renderRuntime);
const render = createRenderer(renderRuntime);

describe('render', () => {
  describe('render', () => {
    let container: Element;

    beforeEach(() => {
      container = document.createElement('div');
    });

    it('should mount a new root element if none exists', () => {
      const element = createElement('div');

      render(element, container as any);

      expect(testHostAdapter.clearNode).toHaveBeenCalledWith(container);
      expect((container as any).__SIMP_ELEMENT__.flag).toBe(SIMP_ELEMENT_FLAG_HOST);
      expect((container as any).__SIMP_ELEMENT__.children).toBe(element);
    });

    it('should patch existing root if new element is provided', () => {
      const initial = createElement('div');
      const next = createElement('section');

      render(initial, container as any);
      render(next, container as any);

      expect((container as any).__SIMP_ELEMENT__.flag).toBe(SIMP_ELEMENT_FLAG_HOST);
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
      container = document.createElement('div');
    });

    it('should mount new root element', () => {
      const root = createRoot(container as any);
      const element = createElement('div');

      root.render(element);

      expect((container as any).__SIMP_ELEMENT__.flag).toBe(SIMP_ELEMENT_FLAG_HOST);
      expect((container as any).__SIMP_ELEMENT__.children).toBe(element);
    });

    it('should patch existing root if present', () => {
      const root = createRoot(container as any);
      const first = createElement('div');
      const second = createElement('section');

      root.render(first);
      root.render(second);

      expect((container as any).__SIMP_ELEMENT__.flag).toBe(SIMP_ELEMENT_FLAG_HOST);
      expect((container as any).__SIMP_ELEMENT__.children).toBe(second);
    });

    it('should unmount the root element', () => {
      const root = createRoot(container as any);
      const element = createElement('div');

      root.render(element);
      root.unmount();

      expect((container as any).__SIMP_ELEMENT__.flag).toBe(SIMP_ELEMENT_FLAG_HOST);
      expect((container as any).__SIMP_ELEMENT__.children).toBe(null);
    });
  });
});

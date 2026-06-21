import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTextElement } from '../../main/core/createElement.js';
import { attachElementToDom, detachElementFromDom, getElementFromDom } from '../../main/dom/attach-element-to-dom.js';
import { domAdapter } from '../../main/dom/index.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('attach-element-to-dom', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let dom: HTMLElement;

  beforeEach(() => {
    runtime = makeRuntime();
    dom = document.createElement('div');
  });

  describe('attachElementToDom', () => {
    it('stores a HOST element and retrieves it by the same DOM node', () => {
      const el = createElement('div');
      attachElementToDom(el, dom, runtime);
      expect(getElementFromDom(dom, runtime)).toBe(el);
    });

    it('does not store TEXT elements', () => {
      const el = createTextElement('hello');
      attachElementToDom(el, dom, runtime);
      expect(getElementFromDom(dom, runtime)).toBeNull();
    });
  });

  describe('getElementFromDom', () => {
    it('returns null when target is null', () => {
      expect(getElementFromDom(null, runtime)).toBeNull();
    });

    it('returns element when target is directly mapped', () => {
      const el = createElement('div');
      attachElementToDom(el, dom, runtime);
      expect(getElementFromDom(dom, runtime)).toBe(el);
    });

    it('walks up parentElement until a mapped ancestor is found', () => {
      const el = createElement('div');
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      attachElementToDom(el, parent, runtime);
      expect(getElementFromDom(child, runtime)).toBe(el);
    });

    it('returns null when no mapped ancestor exists in the tree', () => {
      const unmapped = document.createElement('div');
      expect(getElementFromDom(unmapped, runtime)).toBeNull();
    });
  });

  describe('detachElementFromDom', () => {
    it('removes the entry so subsequent lookups return null', () => {
      const el = createElement('div');
      attachElementToDom(el, dom, runtime);
      detachElementFromDom(dom, runtime);
      expect(getElementFromDom(dom, runtime)).toBeNull();
    });
  });

  describe('runtime isolation', () => {
    it('two runtimes maintain independent maps', () => {
      const runtime2 = makeRuntime();
      const el = createElement('div');
      attachElementToDom(el, dom, runtime);
      expect(getElementFromDom(dom, runtime2)).toBeNull();
    });
  });
});

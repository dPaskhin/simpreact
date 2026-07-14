import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { excludeFromHydration, setHydrating } from '../../main/dom/hydrationState.js';
import { domAdapter } from '../../main/dom/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('domAdapter', () => {
  let runtime: ReturnType<typeof makeRuntime>;

  beforeEach(() => {
    runtime = makeRuntime();
  });

  // -------------------------------------------------------------------------
  // createReference
  // -------------------------------------------------------------------------

  describe('createReference', () => {
    it('creates an HTML element when namespace is absent', () => {
      const el = domAdapter.createReference('div', runtime, document.createElement('div'), undefined);
      expect(el.tagName.toLowerCase()).toBe('div');
      expect(el instanceof HTMLDivElement).toBe(true);
    });

    it('creates an SVG element when SVG namespace is provided', () => {
      const el = domAdapter.createReference('circle', runtime, document.createElement('div'), SVG_NS);
      expect(el.namespaceURI).toBe(SVG_NS);
      expect(el.tagName).toBe('circle');
    });

    it('creates element via createElementNS when any namespace is given', () => {
      const el = domAdapter.createReference('rect', runtime, document.createElement('div'), SVG_NS);
      expect(el.namespaceURI).toBe(SVG_NS);
    });

    describe('when renderRuntime.hydrating is set', () => {
      beforeEach(() => {
        setHydrating(runtime, true);
      });

      it('adopts matching existing elements in order, advancing the cursor', () => {
        const parent = document.createElement('div');
        parent.innerHTML = '<span></span><b></b>';
        const span = parent.children[0];
        const b = parent.children[1];

        expect(domAdapter.createReference('span', runtime, parent, undefined)).toBe(span);
        expect(domAdapter.createReference('b', runtime, parent, undefined)).toBe(b);
        expect(parent.childNodes.length).toBe(2);
      });

      it('falls back to a fresh element on tag mismatch without removing the mismatched node', () => {
        const parent = document.createElement('div');
        parent.innerHTML = '<span></span>';
        const existingSpan = parent.firstChild;

        const fresh = domAdapter.createReference('p', runtime, parent, undefined);

        expect(fresh).not.toBe(existingSpan);
        expect(fresh.tagName.toLowerCase()).toBe('p');
        expect(parent.contains(existingSpan)).toBe(true);
        expect(parent.childNodes.length).toBe(2);
      });

      it('leaves a mismatched candidate available for the next call at the same parent', () => {
        const parent = document.createElement('div');
        parent.innerHTML = '<span></span>';
        const existingSpan = parent.firstChild;

        domAdapter.createReference('p', runtime, parent, undefined);
        const adopted = domAdapter.createReference('span', runtime, parent, undefined);

        expect(adopted).toBe(existingSpan);
      });

      it('creates and appends when there are no more children to adopt', () => {
        const parent = document.createElement('div');
        const fresh = domAdapter.createReference('span', runtime, parent, undefined);
        expect(fresh.tagName.toLowerCase()).toBe('span');
        expect(parent.firstChild).toBe(fresh);
      });

      it('warns only once per parent across repeated mismatches', () => {
        const parent = document.createElement('div');
        parent.innerHTML = '<span></span><span></span>';
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        domAdapter.createReference('p', runtime, parent, undefined);
        domAdapter.createReference('p', runtime, parent, undefined);

        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
      });

      it('creates via createElementNS on mismatch when a namespace is given', () => {
        const parent = document.createElement('div');
        const fresh = domAdapter.createReference('circle', runtime, parent, SVG_NS);
        expect(fresh.namespaceURI).toBe(SVG_NS);
      });

      it('does not adopt inside an excluded (portal target) container', () => {
        const parent = document.createElement('div');
        parent.innerHTML = '<span></span>';
        const existingSpan = parent.firstChild;
        excludeFromHydration(runtime, parent);

        const fresh = domAdapter.createReference('span', runtime, parent, undefined);

        expect(fresh).not.toBe(existingSpan);
      });
    });
  });

  // -------------------------------------------------------------------------
  // createTextReference
  // -------------------------------------------------------------------------

  describe('createTextReference', () => {
    it('creates a Text node with the correct content', () => {
      const node = domAdapter.createTextReference('hello', runtime, document.createElement('div'));
      expect(node).toBeInstanceOf(Text);
      expect(node.nodeValue).toBe('hello');
    });

    describe('when renderRuntime.hydrating is set', () => {
      beforeEach(() => {
        setHydrating(runtime, true);
      });

      it('adopts a matching existing text node and corrects its content', () => {
        const parent = document.createElement('div');
        parent.appendChild(document.createTextNode('server text'));
        const existingText = parent.firstChild;

        const adopted = domAdapter.createTextReference('client text', runtime, parent);

        expect(adopted).toBe(existingText);
        expect(adopted.nodeValue).toBe('client text');
      });

      it('falls back to a fresh text node on type mismatch without removing the mismatched node', () => {
        const parent = document.createElement('div');
        parent.innerHTML = '<span></span>';
        const existingSpan = parent.firstChild;

        const fresh = domAdapter.createTextReference('hello', runtime, parent);

        expect(fresh).toBeInstanceOf(Text);
        expect(fresh.nodeValue).toBe('hello');
        expect(parent.contains(existingSpan)).toBe(true);
        expect(parent.childNodes.length).toBe(2);
      });
    });
  });

  // -------------------------------------------------------------------------
  // setClassname
  // -------------------------------------------------------------------------

  describe('setClassname', () => {
    it('removes the class attribute when className is null', () => {
      const el = document.createElement('div');
      el.className = 'old';
      domAdapter.setClassname(el, null, undefined);
      expect(el.getAttribute('class')).toBeNull();
    });

    it('removes the class attribute when className is empty string', () => {
      const el = document.createElement('div');
      el.className = 'old';
      domAdapter.setClassname(el, '', undefined);
      expect(el.getAttribute('class')).toBeNull();
    });

    it('sets className property in HTML context', () => {
      const el = document.createElement('div');
      domAdapter.setClassname(el, 'foo bar', undefined);
      expect(el.className).toBe('foo bar');
    });

    it('uses setAttribute in SVG context', () => {
      const el = document.createElementNS(SVG_NS, 'svg') as unknown as SVGSVGElement & HTMLElement;
      domAdapter.setClassname(el, 'svg-class', SVG_NS);
      expect(el.getAttribute('class')).toBe('svg-class');
    });
  });

  // -------------------------------------------------------------------------
  // setTextContent
  // -------------------------------------------------------------------------

  describe('setTextContent', () => {
    it('sets textContent when referenceHasOnlyTextElement is falsy', () => {
      const el = document.createElement('p');
      domAdapter.setTextContent(el, 'hello');
      expect(el.textContent).toBe('hello');
    });

    it('sets firstChild.nodeValue when referenceHasOnlyTextElement is true', () => {
      const el = document.createElement('p');
      el.appendChild(document.createTextNode('old'));
      domAdapter.setTextContent(el, 'new', true);
      expect(el.firstChild!.nodeValue).toBe('new');
    });
  });

  // -------------------------------------------------------------------------
  // insertOrAppend
  // -------------------------------------------------------------------------

  describe('insertOrAppend', () => {
    it('appends child when before is null', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      domAdapter.insertOrAppend(parent, child, null);
      expect(parent.firstChild).toBe(child);
    });

    it('inserts child before the given node', () => {
      const parent = document.createElement('div');
      const existing = document.createElement('b');
      parent.appendChild(existing);
      const child = document.createElement('span');
      domAdapter.insertOrAppend(parent, child, existing);
      expect(parent.firstChild).toBe(child);
    });

    it('skips the DOM write when the child is already immediately before the anchor', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      const anchor = document.createElement('b');
      parent.append(child, anchor);
      const insertBefore = vi.spyOn(parent, 'insertBefore');

      domAdapter.insertOrAppend(parent, child, anchor);

      expect(insertBefore).not.toHaveBeenCalled();
      expect(parent.children[0]).toBe(child);
      expect(parent.children[1]).toBe(anchor);
    });

    it('skips the DOM write when the child is already the last child', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      const appendChild = vi.spyOn(parent, 'appendChild');

      domAdapter.insertOrAppend(parent, child, null);

      expect(appendChild).not.toHaveBeenCalled();
      expect(parent.firstChild).toBe(child);
    });
  });

  // -------------------------------------------------------------------------
  // removeChild
  // -------------------------------------------------------------------------

  describe('removeChild', () => {
    it('removes the child from parent', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      domAdapter.removeChild(parent, child);
      expect(parent.childNodes.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // replaceChild
  // -------------------------------------------------------------------------

  describe('replaceChild', () => {
    it('replaces the old node with the new one', () => {
      const parent = document.createElement('div');
      const old = document.createElement('span');
      const replacement = document.createElement('b');
      parent.appendChild(old);
      domAdapter.replaceChild(parent, replacement, old);
      expect(parent.firstChild).toBe(replacement);
    });
  });

  // -------------------------------------------------------------------------
  // clearNode
  // -------------------------------------------------------------------------

  describe('clearNode', () => {
    it('clears all children via textContent', () => {
      const el = document.createElement('div');
      el.innerHTML = '<span>one</span><span>two</span>';
      domAdapter.clearNode(el);
      expect(el.textContent).toBe('');
      expect(el.childNodes.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // attachElementToReference / getElementFromReference / detachElementFromReference
  // -------------------------------------------------------------------------

  describe('element ↔ reference map', () => {
    it('stores and retrieves an element by its DOM reference', () => {
      const el = createElement('div');
      const dom = document.createElement('div');
      domAdapter.attachElementToReference(el, dom, runtime);
      expect(domAdapter.getElementFromReference(dom, runtime)).toBe(el);
    });

    it('getElementFromReference walks up the DOM when target is not directly mapped', () => {
      const el = createElement('div');
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      domAdapter.attachElementToReference(el, parent, runtime);
      expect(domAdapter.getElementFromReference(child, runtime)).toBe(el);
    });

    it('returns null after detach', () => {
      const el = createElement('div');
      const dom = document.createElement('div');
      domAdapter.attachElementToReference(el, dom, runtime);
      domAdapter.detachElementFromReference(dom, runtime);
      expect(domAdapter.getElementFromReference(dom, runtime)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getHostNamespaces
  // -------------------------------------------------------------------------

  describe('getHostNamespaces', () => {
    it('returns SVG namespace for self and children when element is <svg>', () => {
      const el = createElement('svg');
      const ns = domAdapter.getHostNamespaces(el, undefined);
      expect(ns).toEqual({ self: SVG_NS, children: SVG_NS });
    });

    it('returns SVG namespace for self and null for children when element is <foreignObject>', () => {
      const el = createElement('foreignObject');
      const ns = domAdapter.getHostNamespaces(el, undefined);
      expect(ns).toEqual({ self: SVG_NS, children: null });
    });

    it('propagates current namespace for elements inside SVG', () => {
      const el = createElement('circle');
      const ns = domAdapter.getHostNamespaces(el, SVG_NS);
      expect(ns).toEqual({ self: SVG_NS, children: SVG_NS });
    });

    it('returns null for plain HTML elements with no namespace', () => {
      const el = createElement('div');
      const ns = domAdapter.getHostNamespaces(el, undefined);
      expect(ns).toBeNull();
    });

    it('returns null for plain HTML elements with HTML namespace', () => {
      const el = createElement('div');
      const ns = domAdapter.getHostNamespaces(el, 'http://www.w3.org/1999/xhtml');
      expect(ns).toBeNull();
    });
  });
});

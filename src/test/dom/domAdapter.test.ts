import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it } from 'vitest';
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
      const el = domAdapter.createReference('div', undefined);
      expect(el.tagName.toLowerCase()).toBe('div');
      expect(el instanceof HTMLDivElement).toBe(true);
    });

    it('creates an SVG element when SVG namespace is provided', () => {
      const el = domAdapter.createReference('circle', SVG_NS);
      expect(el.namespaceURI).toBe(SVG_NS);
      expect(el.tagName).toBe('circle');
    });

    it('creates element via createElementNS when any namespace is given', () => {
      const el = domAdapter.createReference('rect', SVG_NS);
      expect(el.namespaceURI).toBe(SVG_NS);
    });
  });

  // -------------------------------------------------------------------------
  // createTextReference
  // -------------------------------------------------------------------------

  describe('createTextReference', () => {
    it('creates a Text node with the correct content', () => {
      const node = domAdapter.createTextReference('hello');
      expect(node).toBeInstanceOf(Text);
      expect(node.nodeValue).toBe('hello');
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

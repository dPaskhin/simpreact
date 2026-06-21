import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { domAdapter } from '../../main/dom/index.js';
import { createCreateRoot, createRenderer } from '../../main/dom/render.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('createRenderer', () => {
  let container: HTMLDivElement;
  let runtime: ReturnType<typeof makeRuntime>;
  let render: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    runtime = makeRuntime();
    render = createRenderer(runtime);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  // -------------------------------------------------------------------------
  // Early returns
  // -------------------------------------------------------------------------

  describe('null container', () => {
    it('is a no-op when container is null', () => {
      expect(() => render(createElement('div'), null)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // First mount
  // -------------------------------------------------------------------------

  describe('initial mount', () => {
    it('appends a HOST element into the container', () => {
      render(createElement('div'), container);
      expect(container.querySelector('div')).not.toBeNull();
    });

    it('renders text children', () => {
      render(createElement('p', null, 'hello'), container);
      expect(container.querySelector('p')!.textContent).toBe('hello');
    });

    it('renders nested HOST children', () => {
      render(createElement('div', null, createElement('span', null, 'child')), container);
      expect(container.querySelector('div > span')!.textContent).toBe('child');
    });

    it('renders an FC component', () => {
      const Comp = ({ label }: any) => createElement('b', null, label);
      render(createElement(Comp, { label: 'hi' }), container);
      expect(container.querySelector('b')!.textContent).toBe('hi');
    });

    it('sets className on mounted element', () => {
      render(createElement('div', { className: 'box' }), container);
      expect(container.querySelector('div')!.className).toBe('box');
    });

    it('clears existing container content before mounting', () => {
      container.innerHTML = '<span>stale</span>';
      render(createElement('div'), container);
      expect(container.querySelector('span')).toBeNull();
      expect(container.querySelector('div')).not.toBeNull();
    });

    it('does nothing when element is null and nothing is mounted', () => {
      expect(() => render(null, container)).not.toThrow();
      expect(container.childNodes.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Patch (second render into same container)
  // -------------------------------------------------------------------------

  describe('patch (subsequent render)', () => {
    it('patches text content in place', () => {
      render(createElement('p', null, 'before'), container);
      const p = container.querySelector('p')!;
      render(createElement('p', null, 'after'), container);
      expect(container.querySelector('p')).toBe(p);
      expect(p.textContent).toBe('after');
    });

    it('patches className', () => {
      render(createElement('div', { className: 'a' }), container);
      render(createElement('div', { className: 'b' }), container);
      expect(container.querySelector('div')!.className).toBe('b');
    });

    it('patches an attribute change', () => {
      render(createElement('div', { 'data-x': 'old' }), container);
      render(createElement('div', { 'data-x': 'new' }), container);
      expect(container.querySelector('div')!.getAttribute('data-x')).toBe('new');
    });

    it('replaces element when type changes', () => {
      render(createElement('div'), container);
      const oldDiv = container.querySelector('div');
      render(createElement('span'), container);
      expect(container.querySelector('div')).toBeNull();
      expect(container.querySelector('span')).not.toBeNull();
      expect(container.querySelector('span')).not.toBe(oldDiv);
    });

    it('patches an FC component output', () => {
      const Comp = ({ label }: any) => createElement('b', null, label);
      render(createElement(Comp, { label: 'v1' }), container);
      render(createElement(Comp, { label: 'v2' }), container);
      expect(container.querySelector('b')!.textContent).toBe('v2');
    });
  });

  // -------------------------------------------------------------------------
  // Unmount
  // -------------------------------------------------------------------------

  describe('unmount (render null)', () => {
    it('removes the mounted element from the container', () => {
      render(createElement('div'), container);
      render(null, container);
      expect(container.querySelector('div')).toBeNull();
      expect(container.childNodes.length).toBe(0);
    });

    it('removes FC component and all its children', () => {
      const Comp = () => createElement('div', null, createElement('span'));
      render(createElement(Comp, {}), container);
      render(null, container);
      expect(container.querySelector('div')).toBeNull();
    });

    it('clears the container reference so a subsequent mount works', () => {
      render(createElement('div'), container);
      render(null, container);
      render(createElement('p'), container);
      expect(container.querySelector('p')).not.toBeNull();
      expect(container.querySelector('div')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // SVG namespace — covers the non-null branch of getHostNamespaces()?.self
  // -------------------------------------------------------------------------

  describe('SVG namespace', () => {
    it('mounts an <svg> element using the SVG namespace', () => {
      render(createElement('svg'), container);
      const svg = container.querySelector('svg')!;
      expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    });

    it('patches an <svg> element without error', () => {
      render(createElement('svg', { 'data-v': '1' }), container);
      render(createElement('svg', { 'data-v': '2' }), container);
      expect(container.querySelector('svg')!.getAttribute('data-v')).toBe('2');
    });
  });
});

// ---------------------------------------------------------------------------
// createCreateRoot
// ---------------------------------------------------------------------------

describe('createCreateRoot', () => {
  let container: HTMLDivElement;
  let runtime: ReturnType<typeof makeRuntime>;

  beforeEach(() => {
    runtime = makeRuntime();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('root.render() mounts an element', () => {
    const root = createCreateRoot(runtime)(container);
    root.render(createElement('div'));
    expect(container.querySelector('div')).not.toBeNull();
    root.unmount();
  });

  it('second root.render() patches in place', () => {
    const root = createCreateRoot(runtime)(container);
    root.render(createElement('p', null, 'v1'));
    const p = container.querySelector('p')!;
    root.render(createElement('p', null, 'v2'));
    expect(container.querySelector('p')).toBe(p);
    expect(p.textContent).toBe('v2');
    root.unmount();
  });

  it('root.unmount() removes all mounted content', () => {
    const root = createCreateRoot(runtime)(container);
    root.render(createElement('div'));
    root.unmount();
    expect(container.querySelector('div')).toBeNull();
    expect(container.childNodes.length).toBe(0);
  });
});

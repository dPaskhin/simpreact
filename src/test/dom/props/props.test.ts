import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domAdapter } from '../../../main/dom/index.js';
import { mountProps, patchProps, unmountProps } from '../../../main/dom/props/props.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const HTML_NS = 'http://www.w3.org/1999/xhtml';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

// ---------------------------------------------------------------------------
// mountProps — regular elements
// ---------------------------------------------------------------------------

describe('mountProps — regular elements', () => {
  let dom: HTMLDivElement;
  let runtime: ReturnType<typeof makeRuntime>;

  beforeEach(() => {
    dom = document.createElement('div');
    runtime = makeRuntime();
    vi.spyOn(document, 'addEventListener');
  });

  afterEach(() => vi.restoreAllMocks());

  it('sets a data-* attribute via setAttribute', () => {
    const el = createElement('div', { 'data-id': '42' });
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.getAttribute('data-id')).toBe('42');
  });

  it('sets boolean prop disabled as a DOM property', () => {
    const el = createElement('div', { disabled: true });
    mountProps(dom, el, HTML_NS, runtime);
    expect((dom as any).disabled).toBe(true);
  });

  it('sets hidden as a DOM property', () => {
    const el = createElement('div', { hidden: true });
    mountProps(dom, el, HTML_NS, runtime);
    expect((dom as any).hidden).toBe(true);
  });

  it('sets autoFocus as dom.autofocus', () => {
    const el = createElement('div', { autoFocus: true });
    mountProps(dom, el, HTML_NS, runtime);
    expect((dom as any).autofocus).toBe(true);
  });

  it('sets volume as a DOM property', () => {
    const video = document.createElement('video') as any;
    const el = createElement('video', { volume: 0.5 });
    mountProps(video, el, HTML_NS, runtime);
    expect(video.volume).toBe(0.5);
  });

  it('skips children, className, key, ref props', () => {
    const el = createElement('div', { children: 'x', className: 'c', key: 'k', ref: {} });
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.getAttribute('children')).toBeNull();
    expect(dom.getAttribute('className')).toBeNull();
    expect(dom.getAttribute('key')).toBeNull();
    expect(dom.getAttribute('ref')).toBeNull();
  });

  it('delegates style to patchStyle', () => {
    const el = createElement('div', { style: { color: 'red' } });
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.style.color).toBe('red');
  });

  it('delegates dangerouslySetInnerHTML to patchDangerInnerHTML', () => {
    const el = createElement('div', { dangerouslySetInnerHTML: { __html: '<b>hi</b>' } });
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.innerHTML).toBe('<b>hi</b>');
  });

  it('registers a delegated event handler via patchEvent', () => {
    const handler = vi.fn();
    const el = createElement('div', { onClick: handler });
    mountProps(dom, el, HTML_NS, runtime);
    expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('sets allowfullscreen as a DOM property (boolean case in patchDefaultElementPropAndAttrs)', () => {
    const video = document.createElement('div') as any;
    const el = createElement('div', { allowfullscreen: true });
    mountProps(video, el, HTML_NS, runtime);
    expect(video.allowfullscreen).toBe(true);
  });

  it('sets xlink:href via setAttributeNS in SVG context', () => {
    const svgDom = document.createElementNS(SVG_NS, 'use') as unknown as HTMLElement;
    const el = createElement('use', { 'xlink:href': '#icon' });
    mountProps(svgDom, el, SVG_NS, runtime);
    // getAttributeNS takes the local name (no prefix)
    expect(svgDom.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe('#icon');
  });

  it('sets xml:lang via setAttributeNS', () => {
    const svgDom = document.createElementNS(SVG_NS, 'svg') as unknown as HTMLElement;
    const el = createElement('svg', { 'xml:lang': 'en' });
    mountProps(svgDom, el, SVG_NS, runtime);
    expect(svgDom.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'lang')).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// mountProps — form elements (uncontrolled)
// ---------------------------------------------------------------------------

describe('mountProps — form elements, uncontrolled', () => {
  let runtime: ReturnType<typeof makeRuntime>;

  beforeEach(() => {
    runtime = makeRuntime();
  });

  it('sets value DOM prop for uncontrolled input', () => {
    const dom = document.createElement('input') as any;
    const el = createElement('input', { defaultValue: 'init' });
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.defaultValue).toBe('init');
  });

  it('sets multiple as DOM prop', () => {
    const dom = document.createElement('select') as any;
    const el = createElement('select', { multiple: true });
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.multiple).toBe(true);
  });

  it('sets defaultChecked as DOM property', () => {
    const dom = document.createElement('input') as any;
    const el = createElement('input', { type: 'checkbox', defaultChecked: true });
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.defaultChecked).toBe(true);
  });

  it('sets readOnly as a boolean DOM property on form element', () => {
    const dom = document.createElement('input') as any;
    const el = createElement('input', { readOnly: true });
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.readOnly).toBe(true);
  });

  it('sets required as a boolean DOM property on form element', () => {
    const dom = document.createElement('input') as any;
    const el = createElement('input', { required: true });
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.required).toBe(true);
  });

  it('sets capture as a boolean DOM property on form element', () => {
    const dom = document.createElement('input') as any;
    const el = createElement('input', { capture: true });
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.capture).toBe(true);
  });

  it('sets a generic attribute (name) on a form element via setAttribute', () => {
    const dom = document.createElement('input');
    const el = createElement('input', { name: 'username' });
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.getAttribute('name')).toBe('username');
  });

  it('does not add controlled event handlers when uncontrolled', () => {
    const dom = document.createElement('input');
    const el = createElement('input', { defaultValue: 'x' });
    const spy = vi.spyOn(dom, 'addEventListener');
    mountProps(dom, el, HTML_NS, runtime);
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// mountProps — form elements (controlled)
// ---------------------------------------------------------------------------

describe('mountProps — form elements, controlled', () => {
  let runtime: ReturnType<typeof makeRuntime>;

  beforeEach(() => {
    runtime = makeRuntime();
  });

  it('adds controlled event handlers when value prop is present', () => {
    const dom = document.createElement('input');
    const el = createElement('input', { value: 'controlled' });
    el.reference = dom;
    const spy = vi.spyOn(dom, 'addEventListener');
    mountProps(dom, el, HTML_NS, runtime);
    expect(spy).toHaveBeenCalled();
  });

  it('syncs value on mount for controlled input', () => {
    const dom = document.createElement('input') as any;
    const el = createElement('input', { value: 'hello' });
    el.reference = dom;
    mountProps(dom, el, HTML_NS, runtime);
    expect(dom.value).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// patchProps — regular elements
// ---------------------------------------------------------------------------

describe('patchProps — regular elements', () => {
  let dom: HTMLDivElement;
  let runtime: ReturnType<typeof makeRuntime>;

  beforeEach(() => {
    dom = document.createElement('div');
    runtime = makeRuntime();
    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => vi.restoreAllMocks());

  it('updates a changed attribute', () => {
    const prev = createElement('div', { 'data-x': 'old' });
    const next = createElement('div', { 'data-x': 'new' });
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(dom.getAttribute('data-x')).toBe('new');
  });

  it('removes an attribute when next value is null', () => {
    dom.setAttribute('data-x', 'old');
    const prev = createElement('div', { 'data-x': 'old' });
    const next = createElement('div', {});
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(dom.getAttribute('data-x')).toBeNull();
  });

  it('adds a new attribute not in prevProps', () => {
    const prev = createElement('div', {});
    const next = createElement('div', { 'data-new': 'yes' });
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(dom.getAttribute('data-new')).toBe('yes');
  });

  it('skips unchanged props', () => {
    dom.setAttribute('data-x', 'same');
    const prev = createElement('div', { 'data-x': 'same' });
    const next = createElement('div', { 'data-x': 'same' });
    const spy = vi.spyOn(dom, 'setAttribute');
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(spy).not.toHaveBeenCalled();
  });

  it('handles null prevElement.props by treating it as empty (|| emptyObject branch)', () => {
    const prev = createElement('div');
    prev.props = null;
    const next = createElement('div', { 'data-x': 'added' });
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(dom.getAttribute('data-x')).toBe('added');
  });

  it('handles null nextElement.props by treating it as empty (|| emptyObject branch)', () => {
    dom.setAttribute('data-x', 'old');
    const prev = createElement('div', { 'data-x': 'old' });
    const next = createElement('div');
    next.props = null;
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(dom.getAttribute('data-x')).toBeNull();
  });

  it('delegated event: function→function keeps the same document listener (count unchanged)', () => {
    const oldHandler = vi.fn();
    const newHandler = vi.fn();
    const prev = createElement('div', { onClick: oldHandler });
    const next = createElement('div', { onClick: newHandler });
    // Register the initial listener so count = 1
    mountProps(dom, prev, HTML_NS, runtime);
    vi.mocked(document.addEventListener).mockClear();
    vi.mocked(document.removeEventListener).mockClear();
    patchProps(dom, prev, next, HTML_NS, runtime);
    // Delegated events read the handler from element.props at dispatch time,
    // so no document listener change is needed when replacing function→function.
    expect(document.addEventListener).not.toHaveBeenCalled();
    expect(document.removeEventListener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// patchProps — form elements
// ---------------------------------------------------------------------------

describe('patchProps — form elements', () => {
  let runtime: ReturnType<typeof makeRuntime>;

  beforeEach(() => {
    runtime = makeRuntime();
  });

  it('transitions uncontrolled → controlled: adds event handlers', () => {
    const dom = document.createElement('input');
    const prev = createElement('input', { defaultValue: 'x' });
    const next = createElement('input', { value: 'controlled' });
    next.reference = dom;
    const spy = vi.spyOn(dom, 'addEventListener');
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(spy).toHaveBeenCalled();
  });

  it('transitions controlled → uncontrolled: removes event handlers', () => {
    const dom = document.createElement('input');
    const prev = createElement('input', { value: 'controlled' });
    const next = createElement('input', { defaultValue: 'x' });
    prev.reference = dom;
    // Add handlers first
    dom.addEventListener('input', () => {});
    const spy = vi.spyOn(dom, 'removeEventListener');
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(spy).toHaveBeenCalled();
  });

  it('syncs controlled props when remaining controlled', () => {
    const dom = document.createElement('input') as any;
    const prev = createElement('input', { value: 'old' });
    const next = createElement('input', { value: 'new' });
    next.reference = dom;
    prev.reference = dom;
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(dom.value).toBe('new');
  });

  it('ignored event props (e.g. onInput for checkbox) are suppressed', () => {
    const dom = document.createElement('input');
    const handler = vi.fn();
    const prev = createElement('input', { type: 'checkbox', checked: false, onInput: handler });
    const next = createElement('input', { type: 'checkbox', checked: true, onInput: handler });
    prev.reference = dom;
    next.reference = dom;
    const addSpy = vi.spyOn(dom, 'addEventListener');
    patchProps(dom, prev, next, HTML_NS, runtime);
    const inputCalls = addSpy.mock.calls.filter(c => c[0] === 'input');
    expect(inputCalls.length).toBe(0);
  });

  it('skips className and similar skipped props on form elements (no-op)', () => {
    const dom = document.createElement('input');
    const prev = createElement('input', { className: 'old' });
    const next = createElement('input', { className: 'new' });
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(dom.className).toBe('');
  });

  it('skips children prop on form elements (case children: branch)', () => {
    const dom = document.createElement('input');
    const prev = createElement('input', { children: 'a' as any });
    const next = createElement('input', { children: 'b' as any });
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(dom.textContent).toBe('');
  });

  it('patches value to empty string when next element has an explicit null value prop (uncontrolled)', () => {
    const dom = document.createElement('input') as any;
    dom.value = 'old';
    const prev = createElement('input', { defaultValue: 'old' });
    const next = createElement('input', { value: null as any });
    next.reference = dom;
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(dom.value).toBe('');
  });

  it('patches style on a form element', () => {
    const dom = document.createElement('input');
    const prev = createElement('input', { style: { color: 'red' } });
    const next = createElement('input', { style: { color: 'blue' } });
    patchProps(dom, prev, next, HTML_NS, runtime);
    expect(dom.style.color).toBe('blue');
  });

  it('patches non-ignored event handler on a controlled form element', () => {
    const dom = document.createElement('input');
    const addSpy = vi.spyOn(document, 'addEventListener');
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const prev = createElement('input', { value: 'x', onClick: handler1 });
    const next = createElement('input', { value: 'x', onClick: handler2 });
    prev.reference = dom;
    next.reference = dom;
    mountProps(dom, prev, HTML_NS, runtime);
    addSpy.mockClear();
    patchProps(dom, prev, next, HTML_NS, runtime);
    // onClick is not ignored for controlled inputs; delegated function→function keeps same listener
    expect(addSpy).not.toHaveBeenCalled();
    addSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// unmountProps
// ---------------------------------------------------------------------------

describe('unmountProps', () => {
  let runtime: ReturnType<typeof makeRuntime>;

  beforeEach(() => {
    runtime = makeRuntime();
    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => vi.restoreAllMocks());

  it('is a no-op when element.props is null', () => {
    const dom = document.createElement('div');
    const el = createElement('div');
    el.props = null;
    expect(() => unmountProps(dom, el, runtime)).not.toThrow();
  });

  it('removes delegated event listener when onClick was set', () => {
    const dom = document.createElement('div');
    const el = createElement('div', { onClick: vi.fn() });
    // Add first so count > 0
    mountProps(dom, el, HTML_NS, runtime);
    unmountProps(dom, el, runtime);
    expect(document.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('removes controlled form element handlers on unmount', () => {
    const dom = document.createElement('input');
    const el = createElement('input', { value: 'x' });
    el.reference = dom;
    mountProps(dom, el, HTML_NS, runtime);
    const spy = vi.spyOn(dom, 'removeEventListener');
    unmountProps(dom, el, runtime);
    expect(spy).toHaveBeenCalled();
  });
});

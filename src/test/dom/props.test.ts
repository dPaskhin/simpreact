import { createElement } from '@simpreact/core';
import type { SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patchDangerInnerHTML } from '../../main/dom/props/dangerInnerHTML.js';
import { mountProps, unmountProps } from '../../main/dom/props/props.js';
import { testHostAdapter } from '../test-host-adapter.js';

const createDomElement = () => document.createElement('div');

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
  elementToHostMap: new Map(),
  renderStack: [],
  renderPhase: null,
  currentRenderingFCElement: null,
};

describe('patchDangerInnerHTML', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set innerHTML on mount when nextElement exists and nextValue provided', () => {
    const dom = createDomElement();
    const nextValue = { __html: '<b>Hello</b>' };
    const nextElement = createElement('div', null, createElement('span'));

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    patchDangerInnerHTML(null, nextValue, nextElement, dom);

    expect(dom.innerHTML).toBe('<b>Hello</b>');
    expect(warn).toHaveBeenCalledWith(
      'Avoid setting both children and props.dangerouslySetInnerHTML at the same time — this causes unpredictable behavior.'
    );
    warn.mockRestore();
  });

  it('should do nothing if no nextValue and nextElement exists', () => {
    const dom = createDomElement();
    const nextElement = createElement('div');
    patchDangerInnerHTML(null, null, nextElement, dom);
    expect(dom.innerHTML).toBe('');
  });

  it('should clear innerHTML if nextValue is null and prevValue exists', () => {
    const dom = createDomElement();
    dom.innerHTML = '<p>Test</p>';
    patchDangerInnerHTML({ __html: '<p>Test</p>' }, null, createElement('div'), dom);
    expect(dom.innerHTML).toBe('');
  });

  it('should set innerHTML when next element also has children', () => {
    const dom = createDomElement();
    const nextElement = createElement('div', null, createElement('s'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    patchDangerInnerHTML(null, { __html: '<i>Updated</i>' }, nextElement, dom);

    expect(dom.innerHTML).toBe('<i>Updated</i>');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('should set innerHTML when next element has multiple children', () => {
    const dom = createDomElement();
    const nextElement = createElement('div', null, createElement('s'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    patchDangerInnerHTML(null, { __html: '<i>Updated</i>' }, nextElement, dom);

    expect(dom.innerHTML).toBe('<i>Updated</i>');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('should update innerHTML without touching previous children', () => {
    const dom = createDomElement();
    const prevElement = createElement('div', null, createElement('span'), createElement('p'));
    const prevElementChildren = prevElement.children;
    const nextElement = createElement('div');

    patchDangerInnerHTML({ __html: 'old' }, { __html: 'new' }, nextElement, dom);

    expect(dom.innerHTML).toBe('new');
    expect(prevElement.children).toBe(prevElementChildren);
  });

  it('should treat empty html as an explicit dangerouslySetInnerHTML value', () => {
    const dom = createDomElement();
    dom.innerHTML = '<span></span>';
    const nextElement = createElement('div');

    patchDangerInnerHTML(null, { __html: '' }, nextElement, dom);

    expect(dom.innerHTML).toBe('');
  });

  it('should keep equivalent innerHTML unchanged', () => {
    const dom = createDomElement();
    dom.innerHTML = '<span></span>';
    const nextElement = createElement('div');

    patchDangerInnerHTML(null, { __html: '<span></span>' }, nextElement, dom);

    expect(dom.innerHTML).toBe('<span></span>');
  });

  it('should not do anything if HTML is the same', () => {
    const dom = createDomElement();
    dom.innerHTML = 'same';
    const prevElement = createElement('div');
    const nextElement = createElement('div');

    patchDangerInnerHTML({ __html: 'same' }, { __html: 'same' }, nextElement, dom);

    expect(dom.innerHTML).toBe('same');
    expect(prevElement.children).toBeNull();
  });
});

describe('unmountProps', () => {
  it('removes controlled form element event handlers', () => {
    const input = document.createElement('input');
    const add = vi.spyOn(input, 'addEventListener');
    const remove = vi.spyOn(input, 'removeEventListener');
    const element = createElement('input', { value: 'hello' });
    element.reference = input;

    mountProps(input, element, 'http://www.w3.org/1999/xhtml', renderRuntime);
    unmountProps(input, element, renderRuntime);

    expect(remove).toHaveBeenCalledWith('input', add.mock.calls[0]![1]);
  });
});

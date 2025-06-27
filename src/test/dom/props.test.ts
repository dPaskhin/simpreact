import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patchDangerInnerHTML } from '../../main/dom/domAdapter';
import { createElement } from '@simpreact/core';
import { unmount, unmountAllChildren } from '@simpreact/internal';

vi.mock('@simpreact/internal', () => ({
  unmount: vi.fn(),
  unmountAllChildren: vi.fn(),
}));

const createDomElement = () => document.createElement('div');

describe('patchDangerInnerHTML', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set innerHTML on mount when nextElement exists and nextValue provided', () => {
    const dom = createDomElement();
    const nextValue = { __html: '<b>Hello</b>' };
    const nextElement = createElement('div', null, createElement('span'));

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    patchDangerInnerHTML(null, nextValue, null, nextElement, dom);

    expect(dom.innerHTML).toBe('<b>Hello</b>');
    expect(nextElement.children).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      'Avoid setting both `children` and `props.dangerouslySetInnerHTML` simultaneously.'
    );
    warn.mockRestore();
  });

  it('should do nothing if no nextValue and nextElement exists', () => {
    const dom = createDomElement();
    const nextElement = createElement('div');
    patchDangerInnerHTML(null, null, null, nextElement, dom);
    expect(dom.innerHTML).toBe('');
  });

  it('should clear innerHTML if nextValue is null and prevValue exists', () => {
    const dom = createDomElement();
    dom.innerHTML = '<p>Test</p>';
    patchDangerInnerHTML({ __html: '<p>Test</p>' }, null, createElement('div'), createElement('div'), dom);
    expect(dom.innerHTML).toBe('');
  });

  it('should unmount children and set innerHTML when prevValue is null and nextValue exists', () => {
    const dom = createDomElement();
    const prevElement = createElement('div', null, createElement('span'));
    const nextElement = createElement('div', null, createElement('s'));
    const prevElementChildren = prevElement.children;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    patchDangerInnerHTML(null, { __html: '<i>Updated</i>' }, prevElement, nextElement, dom);

    expect(unmount).toHaveBeenCalledWith(prevElementChildren);
    expect(dom.innerHTML).toBe('<i>Updated</i>');
    expect(nextElement.children).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('should unmount all children and set innerHTML when prevValue is null and nextValue exists', () => {
    const dom = createDomElement();
    const prevElement = createElement('div', null, createElement('span'), createElement('p'));
    const nextElement = createElement('div', null, createElement('s'));
    const prevElementChildren = prevElement.children;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    patchDangerInnerHTML(null, { __html: '<i>Updated</i>' }, prevElement, nextElement, dom);

    expect(unmountAllChildren).toHaveBeenCalledWith(prevElementChildren);
    expect(dom.innerHTML).toBe('<i>Updated</i>');
    expect(nextElement.children).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('should call unmountAllChildren if prev children is array', () => {
    const dom = createDomElement();
    const prevElement = createElement('div', null, createElement('span'), createElement('p'));
    const prevElementChildren = prevElement.children;
    const nextElement = createElement('div', null, createElement('b'));

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    patchDangerInnerHTML({ __html: 'old' }, { __html: 'new' }, prevElement, nextElement, dom);

    expect(unmountAllChildren).toHaveBeenCalledWith(prevElementChildren);
    expect(dom.innerHTML).toBe('new');
    expect(prevElement.children).toBeUndefined();
    expect(nextElement.children).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('should call unmount if prev children is a SimpElement', () => {
    const dom = createDomElement();
    const prevElement = createElement('div', null, createElement('span'));
    const prevElementChildren = prevElement.children;
    const nextElement = createElement('div', null, createElement('b'));

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    patchDangerInnerHTML({ __html: 'old' }, { __html: 'new' }, prevElement, nextElement, dom);

    expect(unmount).toHaveBeenCalledWith(prevElementChildren);
    expect(dom.innerHTML).toBe('new');
    expect(prevElement.children).toBeUndefined();
    expect(nextElement.children).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('should not do anything if HTML is the same', () => {
    const dom = createDomElement();
    dom.innerHTML = 'same';
    const prevElement = createElement('div');
    const nextElement = createElement('div');

    patchDangerInnerHTML({ __html: 'same' }, { __html: 'same' }, prevElement, nextElement, dom);

    expect(dom.innerHTML).toBe('same');
    expect(unmount).not.toHaveBeenCalled();
    expect(unmountAllChildren).not.toHaveBeenCalled();
  });
});

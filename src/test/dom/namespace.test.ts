import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, mount, provideHostAdapter } from '@simpreact/internal';
import { Element } from 'flyweight-dom';
import { testHostAdapter } from '../test-host-adapter';
import { domAdapter } from '../../main/dom/domAdapter';

provideHostAdapter(
  Object.defineProperty(testHostAdapter, 'getHostNamespaces', {
    value: vi.fn().mockImplementation(domAdapter.getHostNamespaces),
  })
);

describe('namespace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use default (empty) namespace', () => {
    const root = createElement(
      'div',
      null,
      createElement('span'),
      createElement(() => '')
    );

    mount(root, new Element('div', { id: 'root' }), null, null, 'http://www.w3.org/1999/xhtml');

    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(1, 'div', undefined);
    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(2, 'span', undefined);
  });

  it('should change namespace for SVG elements', () => {
    const root = createElement(
      'div',
      null,
      createElement('span'),
      createElement(() => {
        return createElement('svg', null, createElement('path', { d: 'd' }));
      }),
      createElement('b')
    );

    mount(root, new Element('div', { id: 'root' }), null, null, 'http://www.w3.org/1999/xhtml');

    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(1, 'div', undefined);
    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(2, 'span', undefined);
    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(3, 'svg', 'http://www.w3.org/2000/svg');
    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(4, 'path', 'http://www.w3.org/2000/svg');
    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(5, 'b', undefined);
  });

  it('should change namespace for foreignObject elements back to default (empty) namespace', () => {
    const root = createElement(
      'div',
      null,
      createElement('span'),
      createElement(() => {
        return createElement(
          'svg',
          null,
          createElement('path', { d: 'd' }),
          createElement('foreignObject', null, createElement('foreignObject-span'))
        );
      }),
      createElement('b')
    );

    mount(root, new Element('div', { id: 'root' }), null, null, undefined);

    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(1, 'div', undefined);
    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(2, 'span', undefined);
    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(3, 'svg', 'http://www.w3.org/2000/svg');
    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(4, 'path', 'http://www.w3.org/2000/svg');
    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(5, 'foreignObject', 'http://www.w3.org/2000/svg');
    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(6, 'foreignObject-span', undefined);
    expect(testHostAdapter.createReference).toHaveBeenNthCalledWith(7, 'b', undefined);
  });
});

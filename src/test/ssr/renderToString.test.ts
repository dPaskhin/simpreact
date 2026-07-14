import { createPortal, Fragment } from '@simpreact/core';
import { createElement, type SimpElement } from '@simpreact/internal';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from '../../main/ssr/index.js';
import { createSsrRenderRuntime } from '../../main/ssr/runtime.js';

describe('renderToString', () => {
  let render: (element: SimpElement) => string;

  beforeEach(() => {
    const renderRuntime = createSsrRenderRuntime();
    render = element => renderToString(element, { renderRuntime });
  });

  it('renders a plain host element with text content', () => {
    const html = render(createElement('div', null, 'hello'));
    expect(html).toBe('<div>hello</div>');
  });

  it('renders nested host elements', () => {
    const html = render(createElement('div', null, createElement('span', null, 'child')));
    expect(html).toBe('<div><span>child</span></div>');
  });

  it('renders nested plain function components', () => {
    const Leaf = () => createElement('span', null, 'leaf');
    const Branch = () => createElement('div', null, createElement(Leaf, {}));
    expect(render(createElement(Branch, {}))).toBe('<div><span>leaf</span></div>');
  });

  it('renders fragments without wrapper markup', () => {
    const html = render(
      createElement(Fragment, null, createElement('span', null, 'a'), createElement('span', null, 'b'))
    );
    expect(html).toBe('<span>a</span><span>b</span>');
  });

  it('renders an array-returning function component (implicit fragment)', () => {
    const List = () => [createElement('li', null, '1'), createElement('li', null, '2')];
    expect(render(createElement(List, {}))).toBe('<li>1</li><li>2</li>');
  });

  it('renders void elements without a closing tag or children', () => {
    expect(render(createElement('br', null))).toBe('<br>');
    expect(render(createElement('img', { src: 'a.png' }))).toBe('<img src="a.png">');
  });

  it('escapes text content', () => {
    expect(render(createElement('div', null, '<script>&"\''))).toBe('<div>&lt;script&gt;&amp;&quot;&#39;</div>');
  });

  it('escapes attribute values', () => {
    const html = render(createElement('div', { title: '<"quoted"> & more' }));
    expect(html).toBe('<div title="&lt;&quot;quoted&quot;&gt; &amp; more"></div>');
  });

  it('renders dangerouslySetInnerHTML raw, without escaping, overriding children', () => {
    const html = render(createElement('div', { dangerouslySetInnerHTML: { __html: '<b>raw</b>' } }));
    expect(html).toBe('<div><b>raw</b></div>');
  });

  it('skips portal content entirely, matching React SSR', () => {
    const container = {};
    const html = render(createElement('div', null, createPortal(createElement('span', null, 'portalled'), container)));
    expect(html).toBe('<div></div>');
  });

  it('skips falsy children (null, undefined, false, empty string)', () => {
    const html = render(createElement('div', null, null, undefined, false, '', createElement('span', null, 'kept')));
    expect(html).toBe('<div><span>kept</span></div>');
  });

  it('renders className as the class attribute', () => {
    expect(render(createElement('div', { className: 'a b' }))).toBe('<div class="a b"></div>');
  });
});

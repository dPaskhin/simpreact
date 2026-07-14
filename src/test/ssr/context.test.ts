import { createCreateContext, createUseContext } from '@simpreact/context';
import { createElement } from '@simpreact/internal';
import { describe, expect, it } from 'vitest';
import { renderToString } from '../../main/ssr/index.js';
import { createSsrRenderRuntime } from '../../main/ssr/runtime.js';

describe('SSR + context', () => {
  it('propagates a Provider value down to a nested Consumer in one SSR pass', () => {
    const runtime = createSsrRenderRuntime();
    const createContext = createCreateContext(runtime);
    const ctx = createContext('default');

    const Reader = () =>
      createElement(ctx.Consumer, {
        children: (value: unknown) => createElement('span', null, `value: ${value}`),
      });

    const App = () =>
      createElement(ctx.Provider, { value: 'from-provider' }, createElement('div', null, createElement(Reader, {})));

    const html = renderToString(createElement(App, {}), { renderRuntime: runtime });
    expect(html).toBe('<div><span>value: from-provider</span></div>');
  });

  it('useContext resolves the default value when rendered with no ancestor Provider', () => {
    const runtime = createSsrRenderRuntime();
    const createContext = createCreateContext(runtime);
    const useContext = createUseContext(runtime);
    const ctx = createContext('fallback');

    const Reader = () => createElement('span', null, useContext(ctx) as string);
    const html = renderToString(createElement(Reader, {}), { renderRuntime: runtime });
    expect(html).toBe('<span>fallback</span>');
  });
});

import { createUseCatch } from '@simpreact/hooks';
import { createElement } from '@simpreact/internal';
import { describe, expect, it } from 'vitest';
import { renderToString } from '../../main/ssr/index.js';
import { createSsrRenderRuntime } from '../../main/ssr/runtime.js';

describe('renderToString error handling', () => {
  it('propagates synchronously, wrapped, when no ancestor useCatch handles the error', () => {
    const Thrower = () => {
      throw new Error('boom');
    };

    let thrown: any;
    try {
      renderToString(createElement(Thrower, {}), { renderRuntime: createSsrRenderRuntime() });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toBe('Error occurred during rendering a component');
    expect(thrown.cause).toBeInstanceOf(Error);
    expect(thrown.cause.message).toBe('boom');
  });

  it('a handled throw renders empty for that subtree, and unaffected siblings still render', () => {
    const runtime = createSsrRenderRuntime();
    const useCatch = createUseCatch(runtime);

    const Thrower = () => {
      throw new Error('boom');
    };
    const Safe = () => createElement('span', null, 'safe');
    const Parent = () => {
      useCatch(() => {});
      return createElement('div', null, createElement(Thrower, {}), createElement(Safe, {}));
    };

    const html = renderToString(createElement(Parent, {}), { renderRuntime: runtime });
    expect(html).toBe('<div><span>safe</span></div>');
  });
});

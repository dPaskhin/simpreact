import { createUseCatch, createUseEffect, createUseState } from '@simpreact/hooks';
import { createElement } from '@simpreact/internal';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from '../../main/ssr/index.js';
import { createSsrRenderRuntime } from '../../main/ssr/runtime.js';

describe('SSR + hooks (bound via createSsrRenderRuntime + options.renderRuntime)', () => {
  it('useState resolves its initial value into the rendered output', () => {
    const runtime = createSsrRenderRuntime();
    const useState = createUseState(runtime);

    const Counter = () => {
      const [count] = useState(5);
      return createElement('span', null, `count: ${count}`);
    };

    const html = renderToString(createElement(Counter, {}), { renderRuntime: runtime });
    expect(html).toBe('<span>count: 5</span>');
  });

  it('never invokes useEffect bodies during renderToString', () => {
    const runtime = createSsrRenderRuntime();
    const useEffect = createUseEffect(runtime);
    const effect = vi.fn();

    const WithEffect = () => {
      useEffect(effect, []);
      return createElement('div', null, 'ok');
    };

    const html = renderToString(createElement(WithEffect, {}), { renderRuntime: runtime });
    expect(html).toBe('<div>ok</div>');
    expect(effect).not.toHaveBeenCalled();
  });

  it('useCatch catches a child throw; that subtree renders empty, siblings render normally', () => {
    const runtime = createSsrRenderRuntime();
    const useCatch = createUseCatch(runtime);
    const handler = vi.fn();

    const Thrower = () => {
      throw new Error('boom');
    };
    const Parent = () => {
      useCatch(handler);
      return createElement('div', null, createElement(Thrower, {}));
    };

    const html = renderToString(createElement(Parent, {}), { renderRuntime: runtime });
    expect(html).toBe('<div></div>');
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].message).toBe('boom');
  });
});

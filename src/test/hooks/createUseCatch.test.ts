import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domAdapter } from '../../main/dom/index.js';
import { createRenderer } from '../../main/dom/render.js';
import { createUseCatch } from '../../main/hooks/index.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('createUseCatch', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let render: ReturnType<typeof createRenderer>;
  let container: HTMLDivElement;
  let useCatch: ReturnType<typeof createUseCatch>;

  beforeEach(() => {
    runtime = makeRuntime();
    render = createRenderer(runtime);
    useCatch = createUseCatch(runtime);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('handler is called when a direct child FC throws during render', () => {
    const handler = vi.fn();
    const Thrower = () => {
      throw new Error('child error');
    };
    const Parent = () => {
      useCatch(handler);
      return createElement(Thrower, {});
    };
    expect(() => render(createElement(Parent, {}), container)).not.toThrow();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].message).toBe('child error');
  });

  it('all handlers registered in the same component receive the error', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const Thrower = () => {
      throw new Error('multi');
    };
    const Parent = () => {
      useCatch(handler1);
      useCatch(handler2);
      return createElement(Thrower, {});
    };
    render(createElement(Parent, {}), container);
    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('catches error when Thrower is nested inside a HOST element (walks past non-FC parent)', () => {
    const handler = vi.fn();
    const Thrower = () => {
      throw new Error('nested');
    };
    const Parent = () => {
      useCatch(handler);
      // HOST element sits between Parent and Thrower in the parent chain
      return createElement('div', null, createElement(Thrower, {}));
    };
    render(createElement(Parent, {}), container);
    expect(handler).toHaveBeenCalledWith(expect.any(Error));
    expect(handler.mock.calls[0]![0].message).toBe('nested');
  });

  it('propagates to grandparent when intermediate FC has no catcher', () => {
    const grandparentHandler = vi.fn();
    const Thrower = () => {
      throw new Error('propagate');
    };
    const Child = () => createElement(Thrower, {});
    const Parent = () => createElement(Child, {}); // no useCatch
    const Grandparent = () => {
      useCatch(grandparentHandler);
      return createElement(Parent, {});
    };
    render(createElement(Grandparent, {}), container);
    expect(grandparentHandler).toHaveBeenCalledWith(expect.any(Error));
    expect(grandparentHandler.mock.calls[0]![0].message).toBe('propagate');
  });

  it('when handler itself throws, the thrown error propagates to the grandparent catcher', () => {
    const grandparentHandler = vi.fn();
    const Thrower = () => {
      throw new Error('original');
    };
    const Parent = () => {
      useCatch(() => {
        throw new Error('rethrown');
      });
      return createElement(Thrower, {});
    };
    const Grandparent = () => {
      useCatch(grandparentHandler);
      return createElement(Parent, {});
    };
    render(createElement(Grandparent, {}), container);
    expect(grandparentHandler).toHaveBeenCalledWith(expect.any(Error));
    expect(grandparentHandler.mock.calls[0]![0].message).toBe('rethrown');
  });
});

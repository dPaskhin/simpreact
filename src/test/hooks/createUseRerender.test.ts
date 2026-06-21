import { createElement, createRenderRuntime, withSyncRerender } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { domAdapter } from '../../main/dom/index.js';
import { createRenderer } from '../../main/dom/render.js';
import { createUseRerender } from '../../main/hooks/index.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('createUseRerender', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let render: ReturnType<typeof createRenderer>;
  let container: HTMLDivElement;
  let useRerender: ReturnType<typeof createUseRerender>;

  beforeEach(() => {
    runtime = makeRuntime();
    render = createRenderer(runtime);
    useRerender = createUseRerender(runtime);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('returns a function', () => {
    let rerender: any;
    const Comp = () => {
      rerender = useRerender();
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(typeof rerender).toBe('function');
  });

  it('calling the returned function triggers a re-render', () => {
    let renderCount = 0;
    let triggerRerender: any;
    const Comp = () => {
      renderCount++;
      triggerRerender = useRerender();
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(renderCount).toBe(1);
    withSyncRerender(runtime, triggerRerender);
    expect(renderCount).toBe(2);
  });

  it('returns the same function identity across re-renders', () => {
    const captured: any[] = [];
    let triggerRerender: any;
    const Comp = () => {
      triggerRerender = useRerender();
      captured.push(triggerRerender);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    withSyncRerender(runtime, triggerRerender);
    expect(captured.length).toBe(2);
    expect(captured[0]).toBe(captured[1]);
  });
});

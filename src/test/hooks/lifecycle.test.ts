import { createElement, createRenderRuntime, withSyncRerender } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getLifecycleEventBus } from '../../main/core/lifecycleEventBus.js';
import { domAdapter } from '../../main/dom/index.js';
import { createRenderer } from '../../main/dom/render.js';
import { createUseEffect, createUseState } from '../../main/hooks/index.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('hooks lifecycle plugin', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let render: ReturnType<typeof createRenderer>;
  let container: HTMLDivElement;

  beforeEach(() => {
    runtime = makeRuntime();
    render = createRenderer(runtime);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('throws when hooks are called in a different order than the previous render', () => {
    // Use an isolated runtime/container so the broken state doesn't bleed into afterEach cleanup.
    const localRuntime = makeRuntime();
    const localRender = createRenderer(localRuntime);
    const localUseState = createUseState(localRuntime);
    const localContainer = document.createElement('div');
    document.body.appendChild(localContainer);

    let dispatch: any;
    const Comp = () => {
      const [flag, set] = localUseState(true);
      dispatch = set;
      if (flag) {
        localUseState(0); // extra hook on first render only
      }
      return createElement('div');
    };
    localRender(createElement(Comp, {}), localContainer);

    // The hook plugin throws "Hooks called in a different order…", which the core
    // catches and re-wraps as "Error occurred during rendering a component".
    expect(() => withSyncRerender(localRuntime, () => dispatch(false))).toThrow('Error occurred during rendering');

    localContainer.remove();
  });

  it('unmounting a component with no hooks does not throw', () => {
    const NoHooks = () => createElement('span');
    render(createElement(NoHooks, {}), container);
    expect(() => render(null, container)).not.toThrow();
  });

  it('HOST element lifecycle events do not trigger hook state processing', () => {
    expect(() => render(createElement('div', null, createElement('span', null, 'text')), container)).not.toThrow();
  });

  it('skips hook state processing when the event element is not an FC (direct bus publish)', () => {
    // The core only emits lifecycle events for FC elements, so publish one manually
    // with a HOST element to exercise the isFC early-return guard (lines 66-67).
    const bus = getLifecycleEventBus(runtime);
    const hostEl = createElement('div');
    expect(() => bus.publish({ type: 'mounted', element: hostEl, renderRuntime: runtime })).not.toThrow();
  });

  it('re-rendering a component with no effects does not throw (updated: no effectsHookStates)', () => {
    const useState = createUseState(runtime);
    let dispatch: any;
    const Comp = () => {
      const [, set] = useState(0);
      dispatch = set;
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(() => withSyncRerender(runtime, () => dispatch(1))).not.toThrow();
  });

  it('skips error propagation walk when the errored event arrives already handled', () => {
    // Publish an errored event that is pre-marked as handled so the hooks plugin
    // short-circuits after resetting hooksIndex (line 131: if (event.handled) break).
    const bus = getLifecycleEventBus(runtime);
    const FakeFC = () => createElement('div');
    const fakeEl = createElement(FakeFC, {});
    expect(() =>
      bus.publish({
        type: 'errored',
        element: fakeEl,
        error: new Error('pre-handled'),
        handled: true,
        renderRuntime: runtime,
      })
    ).not.toThrow();
  });

  it('effects from multiple components run independently', () => {
    const useEffect = createUseEffect(runtime);
    const calls: string[] = [];
    const A = () => {
      useEffect(() => {
        calls.push('A');
      }, []);
      return createElement('div');
    };
    const B = () => {
      useEffect(() => {
        calls.push('B');
      }, []);
      return createElement('div');
    };
    render(createElement('div', null, createElement(A, {}), createElement(B, {})), container);
    expect(calls).toContain('A');
    expect(calls).toContain('B');
  });
});

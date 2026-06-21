import { createElement, createRenderRuntime, withSyncRerender } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domAdapter } from '../../main/dom/index.js';
import { createRenderer } from '../../main/dom/render.js';
import { createUseEffect, createUseState } from '../../main/hooks/index.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('createUseEffect', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let render: ReturnType<typeof createRenderer>;
  let container: HTMLDivElement;
  let useEffect: ReturnType<typeof createUseEffect>;
  let useState: ReturnType<typeof createUseState>;

  beforeEach(() => {
    runtime = makeRuntime();
    render = createRenderer(runtime);
    useEffect = createUseEffect(runtime);
    useState = createUseState(runtime);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('effect runs synchronously after initial mount', () => {
    const effect = vi.fn();
    const Comp = () => {
      useEffect(effect, []);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(effect).toHaveBeenCalledOnce();
  });

  it('effect with empty deps [] does not re-run on re-render', () => {
    const effect = vi.fn();
    let dispatch: any;
    const Comp = () => {
      const [, set] = useState(0);
      dispatch = set;
      useEffect(effect, []);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    withSyncRerender(runtime, () => dispatch(1));
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('effect re-runs when a dep value changes', () => {
    const effect = vi.fn();
    let dispatch: any;
    const Comp = () => {
      const [count, set] = useState(0);
      dispatch = set;
      useEffect(effect, [count]);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(effect).toHaveBeenCalledTimes(1);

    withSyncRerender(runtime, () => dispatch(1));
    expect(effect).toHaveBeenCalledTimes(2);

    withSyncRerender(runtime, () => dispatch(1)); // same value — no re-run
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it('effect with no deps re-runs on every render', () => {
    const effect = vi.fn();
    let dispatch: any;
    const Comp = () => {
      const [, set] = useState(0);
      dispatch = set;
      useEffect(effect);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    withSyncRerender(runtime, () => dispatch(1));
    withSyncRerender(runtime, () => dispatch(2));
    expect(effect).toHaveBeenCalledTimes(3);
  });

  it('cleanup function runs before the next effect call', () => {
    const order: string[] = [];
    let dispatch: any;
    const Comp = () => {
      const [count, set] = useState(0);
      dispatch = set;
      useEffect(() => {
        order.push(`effect:${count}`);
        return () => order.push(`cleanup:${count}`);
      }, [count]);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(order).toEqual(['effect:0']);

    withSyncRerender(runtime, () => dispatch(1));
    expect(order).toEqual(['effect:0', 'cleanup:0', 'effect:1']);
  });

  it('cleanup runs on unmount', () => {
    const cleanup = vi.fn();
    const Comp = () => {
      useEffect(() => cleanup, []);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    render(null, container);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('no cleanup (effect returns undefined) does not throw on unmount', () => {
    const Comp = () => {
      useEffect(() => {}, []);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(() => render(null, container)).not.toThrow();
  });

  it('multiple effects in one component run in declaration order', () => {
    const calls: number[] = [];
    const Comp = () => {
      useEffect(() => {
        calls.push(1);
      }, []);
      useEffect(() => {
        calls.push(2);
      }, []);
      useEffect(() => {
        calls.push(3);
      }, []);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(calls).toEqual([1, 2, 3]);
  });
});

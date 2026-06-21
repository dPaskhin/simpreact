import { createElement, createRenderRuntime, withSyncRerender } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domAdapter } from '../../main/dom/index.js';
import { createRenderer } from '../../main/dom/render.js';
import { createUseState } from '../../main/hooks/index.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('createUseState', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let render: ReturnType<typeof createRenderer>;
  let container: HTMLDivElement;
  let useState: ReturnType<typeof createUseState>;

  beforeEach(() => {
    runtime = makeRuntime();
    render = createRenderer(runtime);
    useState = createUseState(runtime);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('returns the initial state and a dispatch function', () => {
    let state: any, dispatch: any;
    const Comp = () => {
      [state, dispatch] = useState(99);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(state).toBe(99);
    expect(typeof dispatch).toBe('function');
  });

  it('accepts a factory function as the initial state', () => {
    let state: any;
    const Comp = () => {
      [state] = useState(() => 'computed');
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(state).toBe('computed');
  });

  it('dispatch(value): updates state and triggers a re-render', () => {
    let renderCount = 0;
    let state: any, dispatch: any;
    const Comp = () => {
      renderCount++;
      [state, dispatch] = useState('initial');
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(renderCount).toBe(1);
    expect(state).toBe('initial');

    withSyncRerender(runtime, () => dispatch('updated'));
    expect(renderCount).toBe(2);
    expect(state).toBe('updated');
  });

  it('dispatch(fn): passes previous state to the updater and sets the result', () => {
    let state: any, dispatch: any;
    const Comp = () => {
      [state, dispatch] = useState(10);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    withSyncRerender(runtime, () => dispatch((prev: number) => prev + 5));
    expect(state).toBe(15);
  });

  it('dispatch with the same primitive value (Object.is) does NOT trigger a re-render', () => {
    let renderCount = 0;
    let dispatch: any;
    const Comp = () => {
      renderCount++;
      [, dispatch] = useState(42);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(renderCount).toBe(1);
    withSyncRerender(runtime, () => dispatch(42));
    expect(renderCount).toBe(1);
  });

  it('dispatch with the same object reference does NOT trigger a re-render', () => {
    const obj = { x: 1 };
    let renderCount = 0;
    let dispatch: any;
    const Comp = () => {
      renderCount++;
      [, dispatch] = useState(obj);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    withSyncRerender(runtime, () => dispatch(obj));
    expect(renderCount).toBe(1);
  });

  it('state accumulates correctly across multiple dispatches', () => {
    const states: any[] = [];
    let dispatch: any;
    const Comp = () => {
      const [s, set] = useState(0);
      states.push(s);
      dispatch = set;
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    withSyncRerender(runtime, () => dispatch(7));
    withSyncRerender(runtime, () => dispatch(99));
    expect(states).toEqual([0, 7, 99]);
  });

  it('factory function is only invoked on the first render', () => {
    const factory = vi.fn(() => 'once');
    let dispatch: any;
    const Comp = () => {
      [, dispatch] = useState(factory);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    withSyncRerender(runtime, () => dispatch('other'));
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

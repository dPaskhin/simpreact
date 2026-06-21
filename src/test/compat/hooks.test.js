import { withSyncRerender } from '@simpreact/internal';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from '../../main/compat/core.js';
import { render } from '../../main/compat/dom.js';
import {
  useCallback,
  useDebugValue,
  useId,
  useImperativeHandle,
  useMemo,
  useReducer,
  useSyncExternalStore,
} from '../../main/compat/hooks.js';
import { renderRuntime } from '../../main/compat/index.js';

describe('useReducer', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('returns initial state and a dispatch function (no initializer)', () => {
    let state, dispatch;
    const Comp = () => {
      [state, dispatch] = useReducer((s, a) => s + a, 10);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(state).toBe(10);
    expect(typeof dispatch).toBe('function');
  });

  it('calls initializer(initializerArg) when initializer is provided', () => {
    let state;
    const Comp = () => {
      [state] = useReducer(
        (s, a) => s + a,
        5,
        n => n * 2
      );
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(state).toBe(10);
  });

  it('dispatch applies the reducer and triggers a re-render', () => {
    let state, dispatch;
    const Comp = () => {
      [state, dispatch] = useReducer((s, a) => s + a, 0);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    withSyncRerender(renderRuntime, () => dispatch(5));
    expect(state).toBe(5);
    withSyncRerender(renderRuntime, () => dispatch(3));
    expect(state).toBe(8);
  });

  it('dispatch skips re-render when new state is Object.is equal to current', () => {
    let renderCount = 0;
    let dispatch;
    const Comp = () => {
      renderCount++;
      [, dispatch] = useReducer((_s, a) => a, 42);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(renderCount).toBe(1);
    withSyncRerender(renderRuntime, () => dispatch(42));
    expect(renderCount).toBe(1);
  });

  it('reducer always sees the latest reducer reference', () => {
    let reducerVersion = 'v1';
    let state, dispatch;
    const Comp = () => {
      [state, dispatch] = useReducer((s, _a) => `${s}-${reducerVersion}`, 'start');
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    reducerVersion = 'v2';
    withSyncRerender(renderRuntime, () => dispatch('action'));
    expect(state).toBe('start-v2');
  });
});

describe('useId', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('returns a non-empty string', () => {
    let id;
    const Comp = () => {
      id = useId();
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('uses the default "id" prefix', () => {
    let id;
    const Comp = () => {
      id = useId();
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(id).toMatch(/^id-\d+$/);
  });

  it('uses a custom prefix when provided', () => {
    let id;
    const Comp = () => {
      id = useId('tooltip');
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(id).toMatch(/^tooltip-\d+$/);
  });

  it('returns the same id on re-render', () => {
    const ids = [];
    const Comp = () => {
      ids.push(useId());
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    const firstId = ids[0];
    render(createElement(Comp, {}), container);
    expect(ids[ids.length - 1]).toBe(firstId);
  });

  it('two different components get different ids', () => {
    let id1, id2;
    const CompA = () => {
      id1 = useId();
      return createElement('div');
    };
    const CompB = () => {
      id2 = useId();
      return createElement('div');
    };
    const containerA = document.createElement('div');
    const containerB = document.createElement('div');
    document.body.appendChild(containerA);
    document.body.appendChild(containerB);
    render(createElement(CompA, {}), containerA);
    render(createElement(CompB, {}), containerB);
    expect(id1).not.toBe(id2);
    render(null, containerA);
    render(null, containerB);
    containerA.remove();
    containerB.remove();
  });
});

describe('useMemo', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('runs the factory on mount and returns its result', () => {
    const factory = vi.fn(() => 99);
    let result;
    const Comp = () => {
      result = useMemo(factory, []);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toBe(99);
  });

  it('does not re-run factory when deps are the same', () => {
    const factory = vi.fn(() => Math.random());
    let capturedValue;
    let dispatch;
    const Comp = () => {
      const [count, set] = useReducer(s => s + 1, 0);
      dispatch = set;
      capturedValue = useMemo(factory, [0]);
      void count;
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    const first = capturedValue;
    withSyncRerender(renderRuntime, () => dispatch(null));
    expect(factory).toHaveBeenCalledTimes(1);
    expect(capturedValue).toBe(first);
  });

  it('re-runs factory when a dep changes', () => {
    const factory = vi.fn(dep => dep * 2);
    let capturedValue;
    let dispatch;
    const Comp = () => {
      const [dep, set] = useReducer((_s, a) => a, 1);
      dispatch = set;
      capturedValue = useMemo(() => factory(dep), [dep]);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(capturedValue).toBe(2);
    withSyncRerender(renderRuntime, () => dispatch(5));
    expect(capturedValue).toBe(10);
    expect(factory).toHaveBeenCalledTimes(2);
  });
});

describe('useCallback', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('returns the same function reference when deps are stable', () => {
    const fn = () => 42;
    const captured = [];
    let dispatch;
    const Comp = () => {
      const [count, set] = useReducer(s => s + 1, 0);
      dispatch = set;
      captured.push(useCallback(fn, []));
      void count;
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    withSyncRerender(renderRuntime, () => dispatch(null));
    expect(captured[0]).toBe(fn);
    expect(captured[1]).toBe(fn);
    expect(captured[0]).toBe(captured[1]);
  });

  it('returns a new function reference when deps change', () => {
    const captured = [];
    let dispatch;
    const Comp = () => {
      const [dep, set] = useReducer((_s, a) => a, 1);
      dispatch = set;
      captured.push(useCallback(() => dep, [dep]));
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    withSyncRerender(renderRuntime, () => dispatch(2));
    expect(captured.length).toBe(2);
    expect(captured[0]).not.toBe(captured[1]);
  });
});

describe('useImperativeHandle', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('sets ref.current to the init() result (object ref)', () => {
    const ref = { current: null };
    const handle = { focus: vi.fn() };
    const Comp = () => {
      useImperativeHandle(ref, () => handle, []);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(ref.current).toBe(handle);
  });

  it('calls function ref with the init() result', () => {
    const calls = [];
    const handle = { blur: vi.fn() };
    const Comp = () => {
      useImperativeHandle(
        val => calls.push(val),
        () => handle,
        []
      );
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(calls).toEqual([handle]);
  });

  it('does nothing when ref is null', () => {
    const Comp = () => {
      useImperativeHandle(null, () => ({ noop: true }), []);
      return createElement('div');
    };
    expect(() => render(createElement(Comp, {}), container)).not.toThrow();
  });
});

describe('useSyncExternalStore', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function makeStore(initial) {
    let value = initial;
    let listener = null;
    return {
      get value() {
        return value;
      },
      set value(v) {
        value = v;
      },
      subscribe: cb => {
        listener = cb;
        return () => {
          listener = null;
        };
      },
      notify: () => listener?.(),
      getSnapshot: () => value,
    };
  }

  it('returns the initial snapshot on mount', () => {
    const store = makeStore(7);
    let captured;
    const Comp = () => {
      captured = useSyncExternalStore(store.subscribe, store.getSnapshot);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(captured).toBe(7);
  });

  it('calls subscribe during mount', () => {
    const subscribe = vi.fn(() => () => {});
    const getSnapshot = vi.fn(() => 0);
    const Comp = () => {
      useSyncExternalStore(subscribe, getSnapshot);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(subscribe).toHaveBeenCalledOnce();
  });

  it('triggers a re-render when the snapshot changes', () => {
    const store = makeStore(0);
    let snapshot;
    const Comp = () => {
      snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
      return createElement('div', null, String(snapshot));
    };
    render(createElement(Comp, {}), container);
    expect(snapshot).toBe(0);

    store.value = 99;
    withSyncRerender(renderRuntime, () => store.notify());
    expect(snapshot).toBe(99);
  });

  it('does not re-render when snapshot is unchanged', () => {
    const store = makeStore(5);
    let renderCount = 0;
    const Comp = () => {
      renderCount++;
      useSyncExternalStore(store.subscribe, store.getSnapshot);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(renderCount).toBe(1);

    withSyncRerender(renderRuntime, () => store.notify());
    expect(renderCount).toBe(1);
  });

  it('unsubscribes when the component unmounts', () => {
    const store = makeStore(0);
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);
    const Comp = () => {
      useSyncExternalStore(subscribe, store.getSnapshot);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    render(null, container);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe('useDebugValue', () => {
  it('is a no-op that does not throw', () => {
    expect(() => useDebugValue('debug info')).not.toThrow();
    expect(() => useDebugValue(42, v => `formatted:${v}`)).not.toThrow();
  });
});

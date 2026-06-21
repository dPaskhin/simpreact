import { memo } from '@simpreact/core';
import { createElement, createRenderRuntime, withSyncRerender } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCreateContext, createUseContext } from '../../main/context/index.js';
import { domAdapter } from '../../main/dom/index.js';
import { createRenderer } from '../../main/dom/render.js';
import { createUseState } from '../../main/hooks/index.js';

const flushMicrotasks = () => new Promise<void>(r => setTimeout(r, 0));

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('createCreateContext — Provider and Consumer', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let render: ReturnType<typeof createRenderer>;
  let container: HTMLDivElement;
  let createContext: ReturnType<typeof createCreateContext>;
  let useState: ReturnType<typeof createUseState>;

  beforeEach(() => {
    runtime = makeRuntime();
    render = createRenderer(runtime);
    createContext = createCreateContext(runtime);
    useState = createUseState(runtime);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('returns an object with Provider, Consumer, and defaultValue', () => {
    const ctx = createContext(42);
    expect(typeof ctx.Provider).toBe('function');
    expect(typeof ctx.Consumer).toBe('function');
    expect(ctx.defaultValue).toBe(42);
  });

  it('Consumer returns defaultValue when no Provider is above it', () => {
    const ctx = createContext('fallback');
    let received: unknown;
    const Comp = () =>
      createElement(ctx.Consumer, {
        children: (v: unknown) => {
          received = v;
          return createElement('span');
        },
      });
    render(createElement(Comp, {}), container);
    expect(received).toBe('fallback');
  });

  it('Consumer returns the value provided by Provider', () => {
    const ctx = createContext(0);
    let received: unknown;
    const Comp = () =>
      createElement(
        ctx.Provider,
        { value: 99 },
        createElement(ctx.Consumer, {
          children: (v: unknown) => {
            received = v;
            return createElement('span');
          },
        })
      );
    render(createElement(Comp, {}), container);
    expect(received).toBe(99);
  });

  it('Consumer receives updated value when Provider value changes (patch cascade)', () => {
    const ctx = createContext('a');
    let setState: any;
    const Parent = () => {
      const [val, set] = useState('a');
      setState = set;
      return createElement(
        ctx.Provider,
        { value: val },
        createElement(ctx.Consumer, {
          children: (v: unknown) => createElement('span', null, v as string),
        })
      );
    };
    render(createElement(Parent, {}), container);
    expect(container.textContent).toBe('a');

    withSyncRerender(runtime, () => setState('b'));
    expect(container.textContent).toBe('b');
  });

  it('memoized Consumer re-renders via subscription when Provider value changes', async () => {
    const ctx = createContext('old');
    let setState: any;
    let watcherRenderCount = 0;

    const useContext = createUseContext(runtime);

    const Watcher = memo(() => {
      watcherRenderCount++;
      const val = useContext(ctx);
      return createElement('span', null, val as string);
    });

    const Parent = () => {
      const [val, set] = useState('old');
      setState = set;
      return createElement(ctx.Provider, { value: val }, createElement(Watcher, {}));
    };

    render(createElement(Parent, {}), container);
    expect(watcherRenderCount).toBe(1);
    expect(container.textContent).toBe('old');

    withSyncRerender(runtime, () => setState('new'));
    // Watcher is memo'd — normal patch skips it. Subscription re-render is async.
    expect(watcherRenderCount).toBe(1);

    await flushMicrotasks();
    expect(container.textContent).toBe('new');
    expect(watcherRenderCount).toBe(2);
  });

  it('memoized Consumer does not re-render when Provider emits the same Object.is value', async () => {
    const ctx = createContext(0);
    let setCounter: any;
    let watcherRenderCount = 0;

    const useContext = createUseContext(runtime);

    const Watcher = memo(() => {
      watcherRenderCount++;
      useContext(ctx);
      return createElement('div');
    });

    const Parent = () => {
      const [_counter, set] = useState(0);
      setCounter = set;
      return createElement(ctx.Provider, { value: 42 }, createElement(Watcher, {}));
    };

    render(createElement(Parent, {}), container);
    expect(watcherRenderCount).toBe(1);

    // Re-render Parent — Provider receives the same value (42 === 42)
    withSyncRerender(runtime, () => setCounter(1));
    await flushMicrotasks();

    expect(watcherRenderCount).toBe(1);
  });

  it('multiple Consumers are all notified when Provider value changes', async () => {
    const ctx = createContext('x');
    let setState: any;
    const useContext = createUseContext(runtime);

    let countA = 0;
    let countB = 0;

    const WatcherA = memo(() => {
      countA++;
      useContext(ctx);
      return createElement('span', { id: 'a' });
    });

    const WatcherB = memo(() => {
      countB++;
      useContext(ctx);
      return createElement('span', { id: 'b' });
    });

    const Parent = () => {
      const [val, set] = useState('x');
      setState = set;
      return createElement(
        ctx.Provider,
        { value: val },
        createElement('div', null, createElement(WatcherA, {}), createElement(WatcherB, {}))
      );
    };

    render(createElement(Parent, {}), container);
    expect(countA).toBe(1);
    expect(countB).toBe(1);

    withSyncRerender(runtime, () => setState('y'));
    await flushMicrotasks();

    expect(countA).toBe(2);
    expect(countB).toBe(2);
  });

  it('nested Providers: inner value shadows outer value for descendants', () => {
    const ctx = createContext('default');
    let outerReceived: unknown;
    let innerReceived: unknown;

    const Inner = () =>
      createElement(ctx.Consumer, {
        children: (v: unknown) => {
          innerReceived = v;
          return createElement('span', null, v as string);
        },
      });

    const Outer = () =>
      createElement(ctx.Consumer, {
        children: (v: unknown) => {
          outerReceived = v;
          return createElement('span');
        },
      });

    const Root = () =>
      createElement(
        ctx.Provider,
        { value: 'outer' },
        createElement(
          'div',
          null,
          createElement(Outer, {}),
          createElement(ctx.Provider, { value: 'inner' }, createElement(Inner, {}))
        )
      );

    render(createElement(Root, {}), container);
    expect(outerReceived).toBe('outer');
    expect(innerReceived).toBe('inner');
  });
});

describe('createUseContext', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let render: ReturnType<typeof createRenderer>;
  let container: HTMLDivElement;
  let createContext: ReturnType<typeof createCreateContext>;
  let useContext: ReturnType<typeof createUseContext>;
  let useState: ReturnType<typeof createUseState>;

  beforeEach(() => {
    runtime = makeRuntime();
    render = createRenderer(runtime);
    createContext = createCreateContext(runtime);
    useContext = createUseContext(runtime);
    useState = createUseState(runtime);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('returns defaultValue when no Provider is in the tree', () => {
    const ctx = createContext('missing');
    let received: unknown;
    const Comp = () => {
      received = useContext(ctx);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(received).toBe('missing');
  });

  it('returns the current provided value from the nearest Provider', () => {
    const ctx = createContext(0);
    let received: unknown;
    const Child = () => {
      received = useContext(ctx);
      return createElement('div');
    };
    const Root = () => createElement(ctx.Provider, { value: 7 }, createElement(Child, {}));
    render(createElement(Root, {}), container);
    expect(received).toBe(7);
  });

  it('subscribes the consuming component: async re-render when Provider value changes', async () => {
    const ctx = createContext('init');
    let setState: any;
    let renderCount = 0;

    const Watcher = memo(() => {
      renderCount++;
      const val = useContext(ctx);
      return createElement('span', null, val as string);
    });

    const Parent = () => {
      const [val, set] = useState('init');
      setState = set;
      return createElement(ctx.Provider, { value: val }, createElement(Watcher, {}));
    };

    render(createElement(Parent, {}), container);
    expect(renderCount).toBe(1);
    expect(container.textContent).toBe('init');

    withSyncRerender(runtime, () => setState('changed'));
    expect(renderCount).toBe(1); // memo blocked patch cascade

    await flushMicrotasks();
    expect(container.textContent).toBe('changed');
    expect(renderCount).toBe(2);
  });

  it('does not trigger subscription re-render when Provider value is Object.is equal', async () => {
    const ctx = createContext(0);
    let setTick: any;
    let renderCount = 0;

    const Watcher = memo(() => {
      renderCount++;
      useContext(ctx);
      return createElement('div');
    });

    const Parent = () => {
      const [tick, set] = useState(0);
      setTick = set;
      void tick;
      return createElement(ctx.Provider, { value: 'stable' }, createElement(Watcher, {}));
    };

    render(createElement(Parent, {}), container);
    expect(renderCount).toBe(1);

    withSyncRerender(runtime, () => setTick(1));
    await flushMicrotasks();

    expect(renderCount).toBe(1);
  });

  it('two different contexts in the same component are independent', () => {
    const ctxA = createContext('a-default');
    const ctxB = createContext('b-default');
    let valA: unknown;
    let valB: unknown;

    const Child = () => {
      valA = useContext(ctxA);
      valB = useContext(ctxB);
      return createElement('div');
    };

    const Root = () =>
      createElement(
        ctxA.Provider,
        { value: 'A' },
        createElement(ctxB.Provider, { value: 'B' }, createElement(Child, {}))
      );

    render(createElement(Root, {}), container);
    expect(valA).toBe('A');
    expect(valB).toBe('B');
  });

  it('returns the latest value on every re-render after context changes', async () => {
    const ctx = createContext(0);
    let setState: any;
    const values: unknown[] = [];

    const Watcher = memo(() => {
      values.push(useContext(ctx));
      return createElement('div');
    });

    const Parent = () => {
      const [val, set] = useState(0);
      setState = set;
      return createElement(ctx.Provider, { value: val }, createElement(Watcher, {}));
    };

    render(createElement(Parent, {}), container);

    withSyncRerender(runtime, () => setState(1));
    await flushMicrotasks();

    withSyncRerender(runtime, () => setState(2));
    await flushMicrotasks();

    expect(values).toEqual([0, 1, 2]);
  });
});

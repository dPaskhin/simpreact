/**
 * Tests for miscellaneous core modules:
 * memo, portal, ref, rerender, lifecycleEventBus
 */

import {
  createElement,
  createPortal,
  Fragment,
  getLifecycleEventBus,
  isMemo,
  memo,
  mount,
  patch,
  registerLifecyclePlugin,
  rerender,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_EMPTY,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_FLAG_PORTAL,
  type SimpElement,
  type SimpRenderRuntime,
  unmount,
  withSyncRerender,
} from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _detachElementFromParent,
  findHostReferenceFromElement,
  getLongestIncreasingSubsequenceIndexes,
} from '../main/core/utils.js';
import { testHostAdapter } from './test-host-adapter.js';

function makeRuntime(): SimpRenderRuntime {
  return {
    hostAdapter: testHostAdapter,
    renderer(type, element) {
      return type(element.props || emptyObject);
    },
    elementToHostMap: new Map(),
    renderStack: [],
    renderPhase: null,
    currentRenderingFCElement: null,
  };
}

let renderRuntime: SimpRenderRuntime;
let parent: Element;

beforeEach(() => {
  vi.restoreAllMocks();
  renderRuntime = makeRuntime();
  parent = document.createElement('div');
});

// ---------------------------------------------------------------------------
// memo
// ---------------------------------------------------------------------------

describe('memo', () => {
  it('returns a callable memoized component', () => {
    const Comp = (props: { x: number }) => createElement('div');
    const M = memo(Comp);
    expect(typeof M).toBe('function');
  });

  it('isMemo returns true for memoized components', () => {
    const Comp = () => null;
    const M = memo(Comp);
    expect(isMemo(M)).toBe(true);
    expect(isMemo(Comp)).toBe(false);
  });

  it('isMemo returns false for null/undefined/plain objects', () => {
    expect(isMemo(null)).toBe(false);
    expect(isMemo(undefined)).toBe(false);
    expect(isMemo({})).toBe(false);
  });

  it('preserves the component name', () => {
    function MyComponent() {
      return null;
    }
    const M = memo(MyComponent);
    expect(M.name).toBe('MyComponent');
  });

  it('memoized component delegates render to the original', () => {
    const inner = vi.fn(() => createElement('div'));
    const M = memo(inner);
    const el = createElement(M);
    mount(el, parent, null, null, null, renderRuntime);
    expect(inner).toHaveBeenCalledOnce();
  });

  it('default compare is shallow equality — skips re-render when props identical', () => {
    const renderFn = vi.fn(() => createElement('div'));
    const M = memo(renderFn);
    const el = createElement(M, { a: 1, b: 'x' });
    mount(el, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(M, { a: 1, b: 'x' });
    patch(el, next, parent, null, null, null, renderRuntime);
    expect(renderFn).not.toHaveBeenCalled();
  });

  it('re-renders when props differ', () => {
    const renderFn = vi.fn(() => createElement('div'));
    const M = memo(renderFn);
    const el = createElement(M, { a: 1 });
    mount(el, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(M, { a: 2 });
    patch(el, next, parent, null, null, null, renderRuntime);
    expect(renderFn).toHaveBeenCalledOnce();
  });

  it('uses custom compare function', () => {
    const renderFn = vi.fn(() => createElement('div'));
    const compare = vi.fn(() => true);
    const M = memo(renderFn, compare);

    const el = createElement(M, { value: 99 });
    mount(el, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(M, { value: 100 });
    patch(el, next, parent, null, null, null, renderRuntime);

    expect(compare).toHaveBeenCalled();
    expect(renderFn).not.toHaveBeenCalled();
  });

  it('self-rerender always re-renders even if props unchanged', () => {
    const renderFn = vi.fn(() => createElement('div'));
    const M = memo(renderFn);

    const el = createElement(M, { value: 1 });
    mount(el, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    patch(el, el, parent, null, null, null, renderRuntime);
    expect(renderFn).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// portal
// ---------------------------------------------------------------------------

describe('createPortal', () => {
  it('returns an element with PORTAL flag', () => {
    const container = document.createElement('div');
    const portal = createPortal(createElement('span'), container);
    expect(portal.flag).toBe(SIMP_ELEMENT_FLAG_PORTAL);
  });

  it('stores container as ref', () => {
    const container = document.createElement('div');
    const portal = createPortal(createElement('span'), container);
    expect(portal.ref).toBe(container);
  });

  it('null children creates empty portal', () => {
    const container = document.createElement('div');
    const portal = createPortal(null, container);
    expect(portal.children).toBeNull();
  });

  it('mounted portal content appears in container, placeholder in parent', () => {
    const container = document.createElement('div');
    const portal = createPortal(createElement('b'), container);
    mount(portal, parent, null, null, null, renderRuntime);

    expect(container.children.length).toBe(1);
    expect(container.children[0]!.nodeName).toBe('B');
    expect(portal.reference).toBeInstanceOf(Text);
  });
});

// ---------------------------------------------------------------------------
// ref
// ---------------------------------------------------------------------------

describe('ref', () => {
  it('ref object is assigned .current after mount', () => {
    const ref = { current: null as Element | null };
    const el = createElement('div', { ref });
    mount(el, parent, null, null, null, renderRuntime);
    expect(ref.current).toBeInstanceOf(Element);
  });

  it('ref callback is called with the DOM reference after mount', () => {
    const cb = vi.fn();
    const el = createElement('div', { ref: cb });
    mount(el, parent, null, null, null, renderRuntime);
    expect(cb).toHaveBeenCalledWith(el.reference);
  });

  it('ref callback cleanup is called on next render', () => {
    const cleanup = vi.fn();
    const cb = vi.fn(() => cleanup);
    const prev = createElement('div', { ref: cb });
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', { ref: cb });
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('ref object .current is set to null on unmount', () => {
    const ref = { current: null as Element | null };
    const el = createElement('div', { ref });
    mount(el, parent, null, null, null, renderRuntime);
    expect(ref.current).toBeInstanceOf(Element);

    unmount(el, renderRuntime);
    expect(ref.current).toBeNull();
  });

  it('ref callback cleanup is called on unmount', () => {
    const cleanup = vi.fn();
    const cb = () => cleanup;
    const el = createElement('div', { ref: cb });
    mount(el, parent, null, null, null, renderRuntime);

    unmount(el, renderRuntime);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('no error when ref is null', () => {
    const el = createElement('div');
    expect(() => mount(el, parent, null, null, null, renderRuntime)).not.toThrow();
    expect(() => unmount(el, renderRuntime)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// lifecycleEventBus
// ---------------------------------------------------------------------------

describe('lifecycleEventBus', () => {
  it('getLifecycleEventBus returns the same bus for the same runtime', () => {
    const rt = makeRuntime();
    expect(getLifecycleEventBus(rt)).toBe(getLifecycleEventBus(rt));
  });

  it('getLifecycleEventBus returns different buses for different runtimes', () => {
    expect(getLifecycleEventBus(makeRuntime())).not.toBe(getLifecycleEventBus(makeRuntime()));
  });

  it('subscribers receive published events', () => {
    const rt = makeRuntime();
    const bus = getLifecycleEventBus(rt);
    const listener = vi.fn();
    bus.subscribe(listener);

    bus.publish({ type: 'mounted', element: {} as any, renderRuntime: rt });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('unsubscribe removes the listener', () => {
    const rt = makeRuntime();
    const bus = getLifecycleEventBus(rt);
    const listener = vi.fn();
    const unsub = bus.subscribe(listener);
    unsub();

    bus.publish({ type: 'mounted', element: {} as any, renderRuntime: rt });
    expect(listener).not.toHaveBeenCalled();
  });

  it('subscribing the same listener twice does not double-fire', () => {
    const rt = makeRuntime();
    const bus = getLifecycleEventBus(rt);
    const listener = vi.fn();
    bus.subscribe(listener);
    bus.subscribe(listener);

    bus.publish({ type: 'mounted', element: {} as any, renderRuntime: rt });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('plugin is called when a new bus is created', () => {
    const pluginFn = vi.fn();
    registerLifecyclePlugin(pluginFn);

    // fresh runtime → fresh bus → plugin fires
    getLifecycleEventBus(makeRuntime());
    expect(pluginFn).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// rerender
// ---------------------------------------------------------------------------

describe('rerender', () => {
  it('async rerender triggers a re-render on next microtask', async () => {
    const renderFn = vi.fn(() => createElement('div'));
    const el = createElement(renderFn);
    mount(el, parent, null, null, null, renderRuntime);
    const mountCalls = renderFn.mock.calls.length;

    rerender(el, renderRuntime);
    await Promise.resolve();
    await Promise.resolve(); // two microtask ticks for queueMicrotask → process → queueMicrotask

    expect(renderFn.mock.calls.length).toBeGreaterThan(mountCalls);
  });

  it('rerender on unmounted component warns and does nothing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Comp = () => createElement('div');
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);
    unmount(el, renderRuntime);

    rerender(el, renderRuntime);
    expect(warnSpy).toHaveBeenCalledWith('The component is unmounted.');
  });

  it('withSyncRerender flushes sync queue synchronously after callback', () => {
    const renderFn = vi.fn(() => createElement('div'));
    const el = createElement(renderFn);
    mount(el, parent, null, null, null, renderRuntime);
    const mountCalls = renderFn.mock.calls.length;

    withSyncRerender(renderRuntime, () => {
      rerender(el, renderRuntime);
      expect(renderFn.mock.calls.length).toBe(mountCalls); // not yet flushed
    });

    expect(renderFn.mock.calls.length).toBeGreaterThan(mountCalls);
  });

  it('rerender FC nested inside a HOST element (covers findParentReferenceFromElement HOST branch)', () => {
    const renderFn = vi.fn(() => createElement('span'));
    const fc = createElement(renderFn);
    // Mount fc as a child of a HOST div element — fc.parent becomes the HOST SimpElement.
    // performRerender → findParentReferenceFromElement(fc) → walks to HOST parent → lines 35-37 ✓
    const host = createElement('div', null, fc);
    mount(host, parent, null, null, null, renderRuntime);
    const mountCalls = renderFn.mock.calls.length;

    withSyncRerender(renderRuntime, () => {
      rerender(fc, renderRuntime);
    });

    expect(renderFn.mock.calls.length).toBeGreaterThan(mountCalls);
  });

  it('scheduleAsyncFlush is idempotent – second call before microtask is a no-op', async () => {
    const renderFn = vi.fn(() => createElement('div'));
    const el = createElement(renderFn);
    mount(el, parent, null, null, null, renderRuntime);
    const mountCalls = renderFn.mock.calls.length;

    // Two rerender calls before the microtask flush (hits the early-return at lines 45-46)
    rerender(el, renderRuntime);
    rerender(el, renderRuntime);

    await Promise.resolve();
    await Promise.resolve();

    // Should only re-render once despite two rerender() calls
    expect(renderFn.mock.calls.length).toBe(mountCalls + 1);
  });
});

// ---------------------------------------------------------------------------
// getLongestIncreasingSubsequenceIndexes (imported directly from utils)
// ---------------------------------------------------------------------------

describe('getLongestIncreasingSubsequenceIndexes', () => {
  it('returns empty for empty input', () => {
    expect(getLongestIncreasingSubsequenceIndexes(new Int32Array(0)).length).toBe(0);
  });

  it('zeros are skipped (new-node sentinel)', () => {
    expect(getLongestIncreasingSubsequenceIndexes(new Int32Array([0])).length).toBe(0);
  });

  it('single non-zero element', () => {
    const r = getLongestIncreasingSubsequenceIndexes(new Int32Array([3]));
    expect(r.length).toBe(1);
    expect(r[0]).toBe(0);
  });

  it('strictly ascending: full sequence is LIS', () => {
    const r = getLongestIncreasingSubsequenceIndexes(new Int32Array([1, 2, 3, 4]));
    expect(Array.from(r)).toEqual([0, 1, 2, 3]);
  });

  it('strictly descending: LIS length = 1', () => {
    expect(getLongestIncreasingSubsequenceIndexes(new Int32Array([4, 3, 2, 1])).length).toBe(1);
  });

  it('[2, 3, 1]: LIS is [2, 3] at indices [0, 1]', () => {
    expect(Array.from(getLongestIncreasingSubsequenceIndexes(new Int32Array([2, 3, 1])))).toEqual([0, 1]);
  });

  it('[4, 2, 3]: LIS is [2, 3] at indices [1, 2]', () => {
    expect(Array.from(getLongestIncreasingSubsequenceIndexes(new Int32Array([4, 2, 3])))).toEqual([1, 2]);
  });

  it('[1, 5, 2, 4]: binary search replacement at start>0 sets predecessor (line 184)', () => {
    // When value=2 is processed, binary search finds start=1 (>0) → predecessors[2]=result[0]
    const r = getLongestIncreasingSubsequenceIndexes(new Int32Array([1, 5, 2, 4]));
    // LIS is [1, 2, 4] at indices [0, 2, 3]
    expect(Array.from(r)).toEqual([0, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// _detachElementFromParent (imported directly from utils)
// ---------------------------------------------------------------------------

describe('_detachElementFromParent', () => {
  it('removes element from LIST parent and re-indexes survivors', () => {
    const a = createElement('a', { key: 'a' });
    const b = createElement('b', { key: 'b' });
    const c = createElement('c', { key: 'c' });
    const par = createElement(Fragment, null, a, b, c);
    // parent is not set automatically by createElement — must wire it up manually
    a.parent = par;
    b.parent = par;
    c.parent = par;

    _detachElementFromParent(b);

    expect(par.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_LIST);
    const list = par.children as SimpElement[];
    expect(list).toHaveLength(2);
    expect(list[0]).toBe(a);
    expect(list[1]).toBe(c);
    expect(c.index).toBe(1);
  });

  it('LIST with 2 items collapses to ELEMENT when one is removed', () => {
    const a = createElement('a', { key: 'a' });
    const b = createElement('b', { key: 'b' });
    const par = createElement(Fragment, null, a, b);
    a.parent = par;
    b.parent = par;

    _detachElementFromParent(a);

    expect(par.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    expect(par.children).toBe(b);
  });

  it('removing single ELEMENT child leaves parent EMPTY', () => {
    const child = createElement('span');
    const par = createElement('div', null, child);
    child.parent = par;

    _detachElementFromParent(child);

    expect(par.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_EMPTY);
    expect(par.children).toBeNull();
  });

  it('no-op when element has no parent', () => {
    const el = createElement('div');
    expect(() => _detachElementFromParent(el)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// findHostReferenceFromElement (imported directly from utils)
// ---------------------------------------------------------------------------

describe('findHostReferenceFromElement', () => {
  it('returns null when element is null (line 91)', () => {
    expect(findHostReferenceFromElement(null)).toBeNull();
  });

  it('skips null entries in the traversal stack (lines 100-101)', () => {
    // Need a LIST-childFlag Fragment (requires 2+ children) so the traversal
    // pushes items in reverse; injecting null at index 0 ensures null is
    // pushed last and popped first, hitting the node==null guard on line 99.
    const span = createElement('span');
    const em = createElement('em');
    const frag = createElement(Fragment, null, span, em);
    mount(frag, parent, null, null, null, renderRuntime);

    // Inject null at the front of the list array (unshift so it's pushed last,
    // popped first from the stack) to exercise the defensive continue.
    (frag.children as SimpElement[]).unshift(null as unknown as SimpElement);

    // Should not throw and should still find the span's reference.
    const ref = findHostReferenceFromElement(frag);
    expect(ref).toBe(span.reference);
  });
});

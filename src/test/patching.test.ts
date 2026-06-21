import { createElement, createRenderRuntime, mount, patch, rerender, type SimpElement } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Fragment } from '../main/core/fragment.js';
import { getLifecycleEventBus } from '../main/core/lifecycleEventBus.js';
import { memo } from '../main/core/memo.js';
import { createPortal } from '../main/core/portal.js';
import { testHostAdapter } from './test-host-adapter.js';

const renderRuntime = createRenderRuntime(testHostAdapter, (type, element) => {
  return type(element.props || emptyObject);
});

let parent: Element;

beforeEach(() => {
  vi.restoreAllMocks();
  parent = document.createElement('div');
  renderRuntime.renderStack.length = 0;
});

// ---------------------------------------------------------------------------
// HOST element patching
// ---------------------------------------------------------------------------

describe('patch – HOST element', () => {
  it('reuses the DOM reference (no new element created)', () => {
    const prev = createElement('div');
    mount(prev, parent, null, null, null, renderRuntime);
    const originalRef = prev.reference;

    vi.resetAllMocks();
    const next = createElement('div');
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).not.toHaveBeenCalled();
    expect(next.reference).toBe(originalRef);
  });

  it('calls patchProps on update', () => {
    const prev = createElement('div', { id: 'old' });
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', { id: 'new' });
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.patchProps).toHaveBeenCalledWith(next.reference, prev, next, renderRuntime, null);
  });

  it('updates className when changed', () => {
    const prev = createElement('div', { className: 'old' });
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', { className: 'new' });
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.setClassname).toHaveBeenCalledWith(next.reference, 'new', null);
  });

  it('does not update className when unchanged', () => {
    const prev = createElement('div', { className: 'same' });
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', { className: 'same' });
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.setClassname).not.toHaveBeenCalled();
  });

  it('replaces element when type changes', () => {
    const prev = createElement('div');
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('span');
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('span', '');
    expect(testHostAdapter.replaceChild).toHaveBeenCalledWith(parent, next.reference, prev.reference);
  });

  it('replaces element when key changes', () => {
    const prev = createElement('div', { key: 'a' });
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', { key: 'b' });
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('div', '');
    // old unmounted, new created
    expect(testHostAdapter.unmountProps).toHaveBeenCalled();
  });

  it('patches text content: text → different text', () => {
    const prev = createElement('p', null, 'hello');
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('p', null, 'world');
    patch(prev, next, parent, null, null, null, renderRuntime);

    // third arg `true` signals incremental update (not full reset)
    expect(testHostAdapter.setTextContent).toHaveBeenCalledWith(next.reference, 'world', true);
  });

  it('patches child element → different element (replace)', () => {
    const prev = createElement('div', null, createElement('span', { key: 'x' }));
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', null, createElement('b', { key: 'x' }));
    patch(prev, next, parent, null, null, null, renderRuntime);

    // 'b' replaced 'span'
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('b', '');
  });

  it('applies ref after patch', () => {
    const ref = { current: null as Element | null };
    const prev = createElement('div', { ref });
    mount(prev, parent, null, null, null, renderRuntime);
    expect(ref.current).toBeInstanceOf(Element);

    const next = createElement('div', { ref });
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(ref.current).toBe(next.reference);
  });

  it('throws when stack is not empty', () => {
    const prev = createElement('div');
    mount(prev, parent, null, null, null, renderRuntime);
    renderRuntime.renderStack.push({} as any);

    expect(() => patch(prev, createElement('div'), parent, null, null, null, renderRuntime)).toThrow(
      'Cannot patch while rendering'
    );
    renderRuntime.renderStack.length = 0;
  });
});

// ---------------------------------------------------------------------------
// FC element patching
// ---------------------------------------------------------------------------

describe('patch – FC element', () => {
  it('re-renders FC with updated props', () => {
    const renderFn = vi.fn((props: { id: string }) => createElement('div', { id: props.id }));
    const prev = createElement(renderFn, { id: 'v1' });
    mount(prev, parent, null, null, null, renderRuntime);

    vi.resetAllMocks();
    const next = createElement(renderFn, { id: 'v2' });
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(renderFn).toHaveBeenCalledOnce();
    expect(prev.props).toEqual({ id: 'v2' });
  });

  it('fires updated event after FC patch', () => {
    const listener = vi.fn();
    getLifecycleEventBus(renderRuntime).subscribe(listener);

    const Comp = () => createElement('div');
    const prev = createElement(Comp);
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Comp);
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'updated', element: prev }));
  });

  it('swaps jsx element with long-lived element in parent', () => {
    const Comp = () => createElement('div');
    const prevFrag = createElement(Fragment, null, createElement(Comp, { key: 'k' }));
    mount(prevFrag, parent, null, null, null, renderRuntime);
    const liveElement = prevFrag.children as SimpElement;
    vi.resetAllMocks();

    const nextJsx = createElement(Comp, { key: 'k' });
    const nextFrag = createElement(Fragment, null, nextJsx);
    patch(prevFrag, nextFrag, parent, null, null, null, renderRuntime);

    // after swap, nextFrag.children should be the live element
    expect(nextFrag.children).toBe(liveElement);
  });

  it('replaces FC when type changes', () => {
    const A = () => createElement('x-a');
    const B = () => createElement('x-b');
    const prev = createElement(A);
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(B);
    patch(prev, next, parent, null, null, null, renderRuntime);

    // old FC (and its host child x-a) unmounted, new FC (x-b) mounted
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('x-b', '');
    expect(testHostAdapter.unmountProps).toHaveBeenCalledOnce(); // cleanup inner HOST x-a
  });

  it('re-mounts an unmounted FC', () => {
    const Comp = () => createElement('div');
    const prev = createElement(Comp);
    mount(prev, parent, null, null, null, renderRuntime);
    prev.unmounted = true;
    vi.resetAllMocks();

    const next = createElement(Comp);
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('div', '');
  });

  it('error during FC patch re-render is published and rethrown', () => {
    const listener = vi.fn();
    getLifecycleEventBus(renderRuntime).subscribe(listener);

    let callCount = 0;
    const Comp = () => {
      if (++callCount > 1) throw new Error('patch error');
      return createElement('div');
    };
    const prev = createElement(Comp);
    mount(prev, parent, null, null, null, renderRuntime);

    expect(() => patch(prev, prev, parent, null, null, null, renderRuntime)).toThrow('Error occurred during rendering');

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'errored' }));
  });
});

// ---------------------------------------------------------------------------
// Memo component
// ---------------------------------------------------------------------------

describe('patch – memo', () => {
  it('skips re-render when props are shallowEqual', () => {
    const renderFn = vi.fn(() => createElement('div'));
    const Memoized = memo(renderFn);

    const prev = createElement(Memoized, { value: 1 });
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Memoized, { value: 1 });
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(renderFn).not.toHaveBeenCalled();
  });

  it('re-renders when props differ', () => {
    const renderFn = vi.fn(() => createElement('div'));
    const Memoized = memo(renderFn);

    const prev = createElement(Memoized, { value: 1 });
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Memoized, { value: 2 });
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(renderFn).toHaveBeenCalledOnce();
  });

  it('uses custom compare function', () => {
    const renderFn = vi.fn(() => createElement('div'));
    const compare = vi.fn(() => true);
    const Memoized = memo(renderFn, compare);

    const prev = createElement(Memoized, { value: 99 });
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Memoized, { value: 100 });
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(compare).toHaveBeenCalled();
    expect(renderFn).not.toHaveBeenCalled();
  });

  it('self-rerender (element === prev) always re-renders even if props unchanged', () => {
    const renderFn = vi.fn(() => createElement('div'));
    const Memoized = memo(renderFn);

    const el = createElement(Memoized, { value: 1 });
    mount(el, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    patch(el, el, parent, null, null, null, renderRuntime);

    expect(renderFn).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Fragment patching
// ---------------------------------------------------------------------------

describe('patch – FRAGMENT element', () => {
  it('patches children in place', () => {
    const prev = createElement(Fragment, null, createElement('a', { key: 'k' }));
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Fragment, null, createElement('a', { key: 'k' }));
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).not.toHaveBeenCalled();
    expect(testHostAdapter.patchProps).toHaveBeenCalledOnce();
  });

  it('mounts new children when prev was empty', () => {
    const prev = createElement(Fragment);
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Fragment, null, createElement('span'));
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('span', '');
    expect(parent.children.length).toBe(1);
  });

  it('removes children when next is empty', () => {
    const prev = createElement(Fragment, null, createElement('span'));
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Fragment);
    patch(prev, next, parent, null, null, null, renderRuntime);

    // ELEMENT → EMPTY: _clearElementHostReference removes the host node, then unmounts it
    expect(testHostAdapter.removeChild).toHaveBeenCalledOnce();
    expect(testHostAdapter.unmountProps).toHaveBeenCalledOnce();
  });

  it('fragment DOM order matches next children order after reorder', () => {
    const prev = createElement(
      Fragment,
      null,
      createElement('a', { key: '1' }),
      createElement('b', { key: '2' }),
      createElement('c', { key: '3' })
    );
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(
      Fragment,
      null,
      createElement('c', { key: '3' }),
      createElement('a', { key: '1' }),
      createElement('b', { key: '2' })
    );
    patch(prev, next, parent, null, null, null, renderRuntime);

    const tags = Array.from(parent.children).map(c => c.nodeName);
    expect(tags).toEqual(['C', 'A', 'B']);
    expect(testHostAdapter.insertOrAppend).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Portal patching
// ---------------------------------------------------------------------------

describe('patch – PORTAL element', () => {
  it('patches portal content in the same container', () => {
    const container = document.createElement('section');
    const prev = createPortal(createElement('div', { key: 'k' }), container);
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createPortal(createElement('div', { key: 'k' }), container);
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).not.toHaveBeenCalled();
    expect(testHostAdapter.patchProps).toHaveBeenCalledOnce();
  });

  it('moves content when container changes', () => {
    const container1 = document.createElement('section');
    const container2 = document.createElement('aside');
    const prev = createPortal(createElement('div'), container1);
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createPortal(createElement('div'), container2);
    patch(prev, next, parent, null, null, null, renderRuntime);

    // the child was removed from container1 and appended to container2
    expect(testHostAdapter.removeChild).toHaveBeenCalledWith(container1, expect.anything());
    expect(testHostAdapter.insertOrAppend).toHaveBeenCalledWith(container2, expect.anything(), null);
  });
});

// ---------------------------------------------------------------------------
// children mode transitions
// ---------------------------------------------------------------------------

describe('patch – children mode transitions', () => {
  it('text → text (same): no setTextContent call', () => {
    const prev = createElement('div', null, 'hello');
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', null, 'hello');
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.setTextContent).not.toHaveBeenCalled();
  });

  it('text → text (changed): calls setTextContent', () => {
    const prev = createElement('div', null, 'a');
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', null, 'b');
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.setTextContent).toHaveBeenCalledWith(next.reference, 'b', true);
  });

  it('element → text: unmounts old child, sets text content', () => {
    const prev = createElement('div', null, createElement('span'));
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', null, 'hello');
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.setTextContent).toHaveBeenCalledWith(next.reference, 'hello');
  });

  it('text → element: clears text, mounts new element', () => {
    const prev = createElement('div', null, 'hello');
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', null, createElement('b'));
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.clearNode).toHaveBeenCalledOnce();
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('b', '');
  });

  it('empty → element: mounts new element', () => {
    const prev = createElement('div');
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', null, createElement('span'));
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('span', '');
  });

  it('element → empty: clears element host reference', () => {
    const prev = createElement('div', null, createElement('span'));
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div');
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.detachElementFromReference).toHaveBeenCalledOnce();
    expect(testHostAdapter.unmountProps).toHaveBeenCalledOnce();
  });

  it('element → empty: Fragment child (ELEMENT) – _clearElementHostReference traverses Fragment', () => {
    // div > Fragment(span) — Fragment has a single ELEMENT child
    const frag = createElement(Fragment, null, createElement('span'));
    const prev = createElement('div', null, frag);
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div');
    patch(prev, next, parent, null, null, null, renderRuntime);

    // span was removed from the div via _clearElementHostReference → Fragment ELEMENT branch
    expect(testHostAdapter.removeChild).toHaveBeenCalledOnce();
    expect(testHostAdapter.unmountProps).toHaveBeenCalledOnce();
  });

  it('element → empty: Fragment child (LIST) – _clearElementHostReference clears all list children', () => {
    // div > Fragment(span, em) — Fragment has LIST children
    const frag = createElement(Fragment, null, createElement('span', { key: 's' }), createElement('em', { key: 'e' }));
    const prev = createElement('div', null, frag);
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div');
    patch(prev, next, parent, null, null, null, renderRuntime);

    // Both span and em removed via _clearElementHostReference → Fragment LIST branch
    expect(testHostAdapter.removeChild).toHaveBeenCalledTimes(2);
    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Additional coverage: FC patch error handled, swapChildInParent LIST branch
// ---------------------------------------------------------------------------

describe('patch – FC triedToRerender and error handling', () => {
  it('triedToRerender event during patch causes re-render loop until limit', () => {
    let inPatch = false;
    let liveEl: SimpElement;

    const Comp = () => {
      if (inPatch) {
        // call rerender during render — matches what hooks do — triggers do-while loop
        rerender(liveEl, renderRuntime);
      }
      return createElement('div');
    };

    liveEl = createElement(Comp);
    mount(liveEl, parent, null, null, null, renderRuntime);
    inPatch = true;

    // After 25 iterations the inner error is wrapped as 'Error occurred during rendering'
    expect(() => patch(liveEl, liveEl, parent, null, null, null, renderRuntime)).toThrow(
      'Error occurred during rendering'
    );
  });

  it('error during FC patch is swallowed when handler marks it handled', () => {
    const bus = getLifecycleEventBus(renderRuntime);
    const unsub = bus.subscribe(event => {
      if (event.type === 'errored') {
        event.handled = true;
      }
    });

    let calls = 0;
    const Comp = () => {
      if (++calls > 1) throw new Error('patch error');
      return createElement('div');
    };
    const prev = createElement(Comp);
    mount(prev, parent, null, null, null, renderRuntime);

    expect(() => patch(prev, prev, parent, null, null, null, renderRuntime)).not.toThrow();
    unsub();
  });

  it('stores hostNamespace on FC during patch when hostNamespace is provided (line 200)', () => {
    const Comp = () => createElement('div');
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);

    // Patch with non-null hostNamespace (6th arg)
    patch(el, el, parent, null, null, 'http://www.w3.org/2000/svg', renderRuntime);

    expect(el.hostNamespace).toBe('http://www.w3.org/2000/svg');
  });

  it('_swapChildInParent updates LIST parent (two FC children)', () => {
    const A = () => createElement('x-a');
    const B = () => createElement('x-b');

    // Fragment with two FC children → LIST childFlag
    const prev = createElement(Fragment, null, createElement(A, { key: 'a' }), createElement(B, { key: 'b' }));
    mount(prev, parent, null, null, null, renderRuntime);

    const liveA = (prev.children as SimpElement[])[0]!;
    const liveB = (prev.children as SimpElement[])[1]!;
    vi.resetAllMocks();

    const next = createElement(Fragment, null, createElement(A, { key: 'a' }), createElement(B, { key: 'b' }));
    patch(prev, next, parent, null, null, null, renderRuntime);

    // After swap: next.children[0] and [1] are the live elements (LIST branch of _swapChildInParent)
    const children = next.children as SimpElement[];
    expect(children[0]).toBe(liveA);
    expect(children[1]).toBe(liveB);
  });
});

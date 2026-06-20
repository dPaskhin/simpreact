import { createElement, mount, type SimpElement, type SimpRenderRuntime, unmount } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Fragment } from '../main/core/fragment.js';
import { getLifecycleEventBus } from '../main/core/lifecycleEventBus.js';
import { createPortal } from '../main/core/portal.js';
import { testHostAdapter } from './test-host-adapter.js';

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
  elementToHostMap: new Map(),
  renderStack: [],
  renderPhase: null,
  currentRenderingFCElement: null,
};

let parent: Element;

beforeEach(() => {
  vi.restoreAllMocks();
  parent = document.createElement('div');
  renderRuntime.renderStack.length = 0;
  renderRuntime.elementToHostMap.clear();
});

// ---------------------------------------------------------------------------
// HOST element unmounting
// ---------------------------------------------------------------------------

describe('unmount – HOST element', () => {
  it('calls unmountProps and detachElementFromReference', () => {
    const el = createElement('div');
    mount(el, parent, null, null, null, renderRuntime);
    const ref = el.reference;
    vi.resetAllMocks();

    unmount(el, renderRuntime);

    expect(testHostAdapter.unmountProps).toHaveBeenCalledWith(ref, el, renderRuntime);
    expect(testHostAdapter.detachElementFromReference).toHaveBeenCalledWith(ref, renderRuntime);
  });

  it('does not remove from DOM (caller handles removal)', () => {
    const el = createElement('div');
    mount(el, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    unmount(el, renderRuntime);

    expect(testHostAdapter.removeChild).not.toHaveBeenCalled();
  });

  it('unmounts nested children recursively', () => {
    const child = createElement('span');
    const el = createElement('div', null, child);
    mount(el, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    unmount(el, renderRuntime);

    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(2);
    expect(testHostAdapter.detachElementFromReference).toHaveBeenCalledTimes(2);
  });

  it('clears ref on unmount', () => {
    const ref = { current: null as Element | null };
    const el = createElement('div', { ref });
    mount(el, parent, null, null, null, renderRuntime);
    expect(ref.current).toBeInstanceOf(Element);

    unmount(el, renderRuntime);

    expect(ref.current).toBeNull();
  });

  it('calls ref callback cleanup on unmount', () => {
    const cleanup = vi.fn();
    const ref = () => cleanup;
    const el = createElement('div', { ref });
    mount(el, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    unmount(el, renderRuntime);

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('throws when stack is not empty', () => {
    const el = createElement('div');
    mount(el, parent, null, null, null, renderRuntime);
    renderRuntime.renderStack.push({} as any);

    expect(() => unmount(el, renderRuntime)).toThrow('Cannot unmount while rendering');
    renderRuntime.renderStack.length = 0;
  });
});

// ---------------------------------------------------------------------------
// FC element unmounting
// ---------------------------------------------------------------------------

describe('unmount – FC element', () => {
  it('fires unmounted lifecycle event', () => {
    const listener = vi.fn();
    getLifecycleEventBus(renderRuntime).subscribe(listener);

    const Comp = () => createElement('div');
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    unmount(el, renderRuntime);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'unmounted', element: el }));
  });

  it('marks FC element as unmounted', () => {
    const Comp = () => createElement('div');
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);

    unmount(el, renderRuntime);

    expect(el.unmounted).toBe(true);
  });

  it('second unmount of already-unmounted FC is a no-op', () => {
    const listener = vi.fn();
    getLifecycleEventBus(renderRuntime).subscribe(listener);

    const Comp = () => createElement('div');
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);
    unmount(el, renderRuntime);

    const callsBefore = listener.mock.calls.length;
    unmount(el, renderRuntime);

    expect(listener.mock.calls.length).toBe(callsBefore);
  });

  it('unmounts FC children (DOM element inside FC is cleaned up)', () => {
    const Comp = () => createElement('section');
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);
    const sectionEl = el.children as SimpElement;
    const sectionRef = sectionEl.reference;
    vi.resetAllMocks();

    unmount(el, renderRuntime);

    expect(testHostAdapter.unmountProps).toHaveBeenCalledWith(sectionRef, sectionEl, renderRuntime);
    expect(testHostAdapter.detachElementFromReference).toHaveBeenCalledWith(sectionRef, renderRuntime);
  });
});

// ---------------------------------------------------------------------------
// Fragment unmounting
// ---------------------------------------------------------------------------

describe('unmount – FRAGMENT element', () => {
  it('unmounts all fragment children', () => {
    const frag = createElement(Fragment, null, createElement('a'), createElement('b'), createElement('c'));
    mount(frag, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    unmount(frag, renderRuntime);

    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(3);
    expect(testHostAdapter.detachElementFromReference).toHaveBeenCalledTimes(3);
  });

  it('empty fragment unmount is a no-op', () => {
    const frag = createElement(Fragment);
    mount(frag, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    unmount(frag, renderRuntime);

    expect(testHostAdapter.unmountProps).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Portal unmounting
// ---------------------------------------------------------------------------

describe('unmount – PORTAL element', () => {
  it('unmounts portal children', () => {
    const container = document.createElement('section');
    const portal = createPortal(createElement('div'), container);
    mount(portal, parent, null, null, null, renderRuntime);

    vi.resetAllMocks();

    unmount(portal, renderRuntime);

    expect(testHostAdapter.unmountProps).toHaveBeenCalled();
    expect(testHostAdapter.detachElementFromReference).toHaveBeenCalled();
  });
});

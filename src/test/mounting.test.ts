import { createElement, createRenderRuntime, mount } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Fragment } from '../main/core/fragment.js';
import { getLifecycleEventBus } from '../main/core/lifecycleEventBus.js';
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
// HOST element
// ---------------------------------------------------------------------------

describe('mount – HOST element', () => {
  it('creates and inserts a host element', () => {
    const el = createElement('div');
    mount(el, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('div', '');
    expect(el.reference).toBeInstanceOf(Element);
    expect(parent.children.length).toBe(1);
    expect(parent.children[0]!.nodeName).toBe('DIV');
  });

  it('mounts props on the element', () => {
    const el = createElement('input', { type: 'text', id: 'username' });
    mount(el, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.mountProps).toHaveBeenCalledWith(el.reference, el, renderRuntime, '');
  });

  it('sets className when present', () => {
    const el = createElement('div', { className: 'my-class' });
    mount(el, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.setClassname).toHaveBeenCalledWith(el.reference, 'my-class', '');
  });

  it('does not call setClassname when className is absent', () => {
    const el = createElement('div');
    mount(el, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.setClassname).not.toHaveBeenCalled();
  });

  it('sets text content when child is text', () => {
    const el = createElement('p', null, 'Hello world');
    mount(el, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.setTextContent).toHaveBeenCalledWith(el.reference, 'Hello world');
  });

  it('mounts nested host children', () => {
    const el = createElement('ul', null, createElement('li', null, 'item 1'), createElement('li', null, 'item 2'));
    mount(el, parent, null, null, null, renderRuntime);

    const ul = parent.children[0] as Element;
    expect(ul.children.length).toBe(2);
    expect(ul.children[0]!.nodeName).toBe('LI');
    expect(ul.children[1]!.nodeName).toBe('LI');
  });

  it('applies a ref callback after mount', () => {
    const ref = vi.fn();
    const el = createElement('div', { ref });
    mount(el, parent, null, null, null, renderRuntime);

    expect(ref).toHaveBeenCalledWith(el.reference);
  });

  it('applies a ref object after mount', () => {
    const ref = { current: null as Element | null };
    const el = createElement('div', { ref });
    mount(el, parent, null, null, null, renderRuntime);

    expect(ref.current).toBe(el.reference);
  });

  it('attaches element to reference via hostAdapter', () => {
    const el = createElement('div');
    mount(el, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.attachElementToReference).toHaveBeenCalledWith(el, el.reference, renderRuntime);
  });

  it('inserts before anchor when subtreeRightBoundary is set', () => {
    const anchor = createElement('span');
    mount(anchor, parent, null, null, null, renderRuntime);
    const anchorRef = anchor.reference;

    vi.resetAllMocks();

    const el = createElement('div');
    mount(el, parent, anchor, null, null, renderRuntime);

    expect(testHostAdapter.insertOrAppend).toHaveBeenCalledWith(parent, el.reference, anchorRef);
  });

  it('throws when stack is not empty', () => {
    renderRuntime.renderStack.push({} as any);
    expect(() => mount(createElement('div'), parent, null, null, null, renderRuntime)).toThrow(
      'Cannot mount while rendering'
    );
    renderRuntime.renderStack.length = 0;
  });
});

// ---------------------------------------------------------------------------
// Text elements
// ---------------------------------------------------------------------------

describe('mount – TEXT element', () => {
  it('mounts a text node', () => {
    const el = createElement('p', null, 'some text');
    mount(el, parent, null, null, null, renderRuntime);

    // Text content is set via setTextContent on the host
    expect(testHostAdapter.setTextContent).toHaveBeenCalledWith(el.reference, 'some text');
  });

  it('standalone text element is inserted as Text node', () => {
    const el = createElement('div', null, 'hello');
    mount(el, parent, null, null, null, renderRuntime);
    expect(testHostAdapter.setTextContent).toHaveBeenCalledWith(el.reference, 'hello');
  });
});

// ---------------------------------------------------------------------------
// Fragment elements
// ---------------------------------------------------------------------------

describe('mount – FRAGMENT element', () => {
  it('mounts fragment children directly into parent', () => {
    const frag = createElement(Fragment, null, createElement('a'), createElement('b'));
    mount(frag, parent, null, null, null, renderRuntime);

    expect(parent.children.length).toBe(2);
    expect(parent.children[0]!.nodeName).toBe('A');
    expect(parent.children[1]!.nodeName).toBe('B');
  });

  it('empty fragment mounts nothing', () => {
    const frag = createElement(Fragment);
    mount(frag, parent, null, null, null, renderRuntime);

    expect(parent.children.length).toBe(0);
    expect(testHostAdapter.createReference).not.toHaveBeenCalled();
  });

  it('single-child fragment', () => {
    const frag = createElement(Fragment, null, createElement('span'));
    mount(frag, parent, null, null, null, renderRuntime);

    expect(parent.children.length).toBe(1);
    expect(parent.children[0]!.nodeName).toBe('SPAN');
  });

  it('fragment children inserted in order', () => {
    const children = ['a', 'b', 'c'].map(tag => createElement(tag));
    const frag = createElement(Fragment, null, ...children);
    mount(frag, parent, null, null, null, renderRuntime);

    const tags = Array.from(parent.children).map(c => c.nodeName);
    expect(tags).toEqual(['A', 'B', 'C']);
  });
});

// ---------------------------------------------------------------------------
// FC elements
// ---------------------------------------------------------------------------

describe('mount – FC element', () => {
  it('calls renderer and mounts output', () => {
    const Comp = vi.fn(() => createElement('div', { id: 'comp' }));
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);

    expect(Comp).toHaveBeenCalledOnce();
    expect(parent.children.length).toBe(1);
    expect(parent.children[0]!.getAttribute('id')).toBeNull(); // mountProps mocked
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('div', '');
  });

  it('fires beforeRender and afterRender lifecycle events', () => {
    const listener = vi.fn();
    getLifecycleEventBus(renderRuntime).subscribe(listener);

    const Comp = () => createElement('span');
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'beforeRender', element: el }));
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'afterRender', element: el }));
  });

  it('fires mounted lifecycle event', () => {
    const listener = vi.fn();
    getLifecycleEventBus(renderRuntime).subscribe(listener);

    const Comp = () => createElement('span');
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'mounted', element: el }));
  });

  it('FC returning null mounts nothing', () => {
    const Comp = () => null;
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);

    expect(parent.children.length).toBe(0);
    expect(testHostAdapter.createReference).not.toHaveBeenCalled();
  });

  it('FC returning a fragment mounts fragment children', () => {
    const Comp = () => createElement(Fragment, null, createElement('x'), createElement('y'));
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);

    expect(parent.children.length).toBe(2);
  });

  it('nested FC: outer wraps inner', () => {
    const Inner = () => createElement('div', { className: 'inner' });
    const Outer = () => createElement(Inner);
    const el = createElement(Outer);
    mount(el, parent, null, null, null, renderRuntime);

    expect(parent.children.length).toBe(1);
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('div', '');
  });

  it('FC stores rendered children on the element', () => {
    const Comp = () => createElement('section');
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);

    expect(el.children).toBeTruthy();
  });

  it('throws after 25 re-render attempts', () => {
    const Comp = (props: any) => {
      // signal a desire to re-render on every render call
      getLifecycleEventBus(renderRuntime).publish({
        type: 'triedToRerender',
        element: el,
        renderRuntime,
      });
      return createElement('div');
    };
    const el = createElement(Comp);

    // The inner error 'Too many re-renders' is wrapped by the catch block
    expect(() => mount(el, parent, null, null, null, renderRuntime)).toThrow('Error occurred during rendering');
  });

  it('error during render is published to lifecycle bus and rethrown if unhandled', () => {
    const listener = vi.fn();
    getLifecycleEventBus(renderRuntime).subscribe(listener);

    const Comp = () => {
      throw new Error('render error');
    };
    const el = createElement(Comp);

    expect(() => mount(el, parent, null, null, null, renderRuntime)).toThrow('Error occurred during rendering');

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'errored', element: el }));
  });

  it('error during render is swallowed if a handler marks it handled', () => {
    const bus = getLifecycleEventBus(renderRuntime);
    const unsubscribe = bus.subscribe(event => {
      if (event.type === 'errored') {
        event.handled = true;
      }
    });

    const Comp = () => {
      throw new Error('handled error');
    };
    const el = createElement(Comp);

    expect(() => mount(el, parent, null, null, null, renderRuntime)).not.toThrow();
    unsubscribe();
  });
});

// ---------------------------------------------------------------------------
// Portal
// ---------------------------------------------------------------------------

describe('mount – PORTAL element', () => {
  it('mounts portal children into the target container', () => {
    const container = document.createElement('section');
    const portal = createPortal(createElement('div'), container);
    mount(portal, parent, null, null, null, renderRuntime);

    // The div should appear in container, not in parent
    expect(container.children.length).toBe(1);
    expect(container.children[0]!.nodeName).toBe('DIV');
  });

  it('places a placeholder text node in the source parent', () => {
    const container = document.createElement('section');
    const portal = createPortal(createElement('b'), container);
    mount(portal, parent, null, null, null, renderRuntime);

    // portal.reference points to the placeholder text node
    expect(portal.reference).toBeInstanceOf(Text);
  });
});

// ---------------------------------------------------------------------------
// Additional coverage: FC mounted with unmounted=true flag and hostNamespace
// ---------------------------------------------------------------------------

describe('mount – FC edge cases', () => {
  it('clears unmounted flag when re-mounting a previously unmounted FC', () => {
    const Comp = () => createElement('div');
    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);

    // Simulate what happens after unmount: unmounted is set to true
    el.unmounted = true;

    // Re-mount the same element (e.g. restored after being removed)
    mount(el, parent, null, null, null, renderRuntime);

    // _mountFCEnter should clear the unmounted flag (lines 157-158)
    expect(el.unmounted).toBe(false);
  });

  it('stores hostNamespace on FC element during mount (lines 161-162)', () => {
    const Comp = () => createElement('div');
    const el = createElement(Comp);

    // Pass a non-null hostNamespace (5th arg)
    mount(el, parent, null, null, 'http://www.w3.org/2000/svg', renderRuntime);

    expect(el.hostNamespace).toBe('http://www.w3.org/2000/svg');
  });

  it('stores context on FC element during mount (lines 153-154)', () => {
    const Comp = () => createElement('div');
    const el = createElement(Comp);
    const ctx = { theme: 'dark' };

    // Pass a non-null context (4th arg)
    mount(el, parent, null, ctx, null, renderRuntime);

    expect(el.context).toBe(ctx);
  });
});

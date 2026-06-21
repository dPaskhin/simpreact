import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dispatchDelegatedEvent,
  isPropNameEventName,
  patchDelegatedEvent,
  patchEvent,
  patchNormalEvent,
  SyntheticEvent,
} from '../../main/dom/events.js';
import { domAdapter } from '../../main/dom/index.js';
import { createRenderer } from '../../main/dom/render.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

// ---------------------------------------------------------------------------
// isPropNameEventName
// ---------------------------------------------------------------------------

describe('isPropNameEventName', () => {
  it('returns true for strings starting with "on"', () => {
    expect(isPropNameEventName('onClick')).toBe(true);
    expect(isPropNameEventName('onChange')).toBe(true);
    expect(isPropNameEventName('onInput')).toBe(true);
  });

  it('returns false for strings not starting with "on"', () => {
    expect(isPropNameEventName('click')).toBe(false);
    expect(isPropNameEventName('className')).toBe(false);
    expect(isPropNameEventName('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SyntheticEvent
// ---------------------------------------------------------------------------

describe('SyntheticEvent', () => {
  let nativeEvent: MouseEvent;
  let synthetic: SyntheticEvent;

  beforeEach(() => {
    nativeEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    synthetic = new SyntheticEvent(nativeEvent);
  });

  it('exposes nativeEvent', () => {
    expect(synthetic.nativeEvent).toBe(nativeEvent);
  });

  it('proxies .target to native event', () => {
    expect(synthetic.target).toBe(nativeEvent.target);
  });

  it('proxies .type to native event', () => {
    expect(synthetic.type).toBe('click');
  });

  it('proxies unknown properties to native event (primitive)', () => {
    expect((synthetic as any).bubbles).toBe(true);
  });

  it('proxies unknown function properties bound to native event', () => {
    const composed = (synthetic as any).composedPath;
    expect(typeof composed).toBe('function');
  });

  it('stopPropagation sets isPropagationStopped and calls native', () => {
    const spy = vi.spyOn(nativeEvent, 'stopPropagation');
    synthetic.stopPropagation();
    expect(synthetic.isPropagationStopped).toBe(true);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('preventDefault sets _isDefaultPrevented and calls native', () => {
    const spy = vi.spyOn(nativeEvent, 'preventDefault');
    synthetic.preventDefault();
    expect(synthetic._isDefaultPrevented).toBe(true);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('isDefaultPrevented returns true after preventDefault', () => {
    synthetic.preventDefault();
    expect(synthetic.isDefaultPrevented()).toBe(true);
  });

  it('isDefaultPrevented returns false initially', () => {
    expect(synthetic.isDefaultPrevented()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// patchNormalEvent
// ---------------------------------------------------------------------------

describe('patchNormalEvent', () => {
  let dom: HTMLDivElement;

  beforeEach(() => {
    dom = document.createElement('div');
  });

  it('adds listener when transitioning from null to a function', () => {
    const handler = vi.fn();
    const spy = vi.spyOn(dom, 'addEventListener');
    patchNormalEvent('scroll', null, handler, dom, false);
    expect(spy).toHaveBeenCalledWith('scroll', handler, { capture: false });
  });

  it('removes old listener and adds new one when replacing', () => {
    const prev = vi.fn();
    const next = vi.fn();
    const removeSpy = vi.spyOn(dom, 'removeEventListener');
    const addSpy = vi.spyOn(dom, 'addEventListener');
    patchNormalEvent('scroll', prev, next, dom, false);
    expect(removeSpy).toHaveBeenCalledWith('scroll', prev, { capture: false });
    expect(addSpy).toHaveBeenCalledWith('scroll', next, { capture: false });
  });

  it('removes listener when transitioning to null', () => {
    const prev = vi.fn();
    const removeSpy = vi.spyOn(dom, 'removeEventListener');
    const addSpy = vi.spyOn(dom, 'addEventListener');
    patchNormalEvent('scroll', prev, null, dom, false);
    expect(removeSpy).toHaveBeenCalledWith('scroll', prev, { capture: false });
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('passes capture:true when isCapture is true', () => {
    const handler = vi.fn();
    const spy = vi.spyOn(dom, 'addEventListener');
    patchNormalEvent('scroll', null, handler, dom, true);
    expect(spy).toHaveBeenCalledWith('scroll', handler, { capture: true });
  });
});

// ---------------------------------------------------------------------------
// patchDelegatedEvent
// ---------------------------------------------------------------------------

describe('patchDelegatedEvent', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let counts: any;
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    runtime = makeRuntime();
    counts = { click: 0 };
    addSpy = vi.spyOn(document, 'addEventListener');
    removeSpy = vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('adds document listener when first handler is registered', () => {
    patchDelegatedEvent('click', null, vi.fn(), counts, runtime);
    expect(counts.click).toBe(1);
    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('does not add another document listener on second handler', () => {
    patchDelegatedEvent('click', null, vi.fn(), counts, runtime);
    addSpy.mockClear();
    patchDelegatedEvent('click', null, vi.fn(), counts, runtime);
    expect(counts.click).toBe(2);
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('does not remove document listener when count goes from 2 to 1', () => {
    patchDelegatedEvent('click', null, vi.fn(), counts, runtime);
    patchDelegatedEvent('click', null, vi.fn(), counts, runtime);
    removeSpy.mockClear();
    patchDelegatedEvent('click', vi.fn(), null, counts, runtime);
    expect(counts.click).toBe(1);
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('removes document listener when count reaches zero', () => {
    patchDelegatedEvent('click', null, vi.fn(), counts, runtime);
    patchDelegatedEvent('click', vi.fn(), null, counts, runtime);
    expect(counts.click).toBe(0);
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('guard: does not decrement below zero or call removeEventListener when count is already 0', () => {
    patchDelegatedEvent('click', vi.fn(), null, counts, runtime);
    expect(counts.click).toBe(0);
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('two runtimes get independent dispatchers', () => {
    const runtime2 = makeRuntime();
    const counts2 = { click: 0 };
    patchDelegatedEvent('click', null, vi.fn(), counts, runtime);
    patchDelegatedEvent('click', null, vi.fn(), counts2 as any, runtime2);
    const calls = addSpy.mock.calls.filter(c => c[0] === 'click');
    const handlers = calls.map(c => c[1]);
    expect(handlers[0]).not.toBe(handlers[1]);
  });
});

// ---------------------------------------------------------------------------
// patchEvent routing
// ---------------------------------------------------------------------------

describe('patchEvent', () => {
  let dom: HTMLDivElement;
  let runtime: ReturnType<typeof makeRuntime>;

  beforeEach(() => {
    dom = document.createElement('div');
    runtime = makeRuntime();
    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes delegated events (onClick) to patchDelegatedEvent', () => {
    const handler = vi.fn();
    patchEvent('onClick', null, handler, dom, runtime);
    expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('routes capture variant (onClickCapture) to delegated path', () => {
    const handler = vi.fn();
    patchEvent('onClickCapture', null, handler, dom, runtime);
    expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('routes non-delegated events (onScroll) to patchNormalEvent', () => {
    const handler = vi.fn();
    const spy = vi.spyOn(dom, 'addEventListener');
    patchEvent('onScroll', null, handler, dom, runtime);
    expect(spy).toHaveBeenCalledWith('scroll', handler, { capture: false });
  });

  it('routes onScrollCapture to patchNormalEvent with capture:true', () => {
    const handler = vi.fn();
    const spy = vi.spyOn(dom, 'addEventListener');
    patchEvent('onScrollCapture', null, handler, dom, runtime);
    expect(spy).toHaveBeenCalledWith('scroll', handler, { capture: true });
  });
});

// ---------------------------------------------------------------------------
// dispatchDelegatedEvent
// ---------------------------------------------------------------------------

describe('dispatchDelegatedEvent', () => {
  let container: HTMLDivElement;
  let runtime: ReturnType<typeof makeRuntime>;
  let render: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    runtime = makeRuntime();
    render = createRenderer(runtime);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  it('fires the onClick handler on the clicked element', () => {
    const onClick = vi.fn();
    render(createElement('div', { onClick }), container);
    const div = container.querySelector('div')!;
    div.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('bubbles: fires parent onClick when child is clicked', () => {
    const parentClick = vi.fn();
    const childClick = vi.fn();
    render(createElement('div', { onClick: parentClick }, createElement('span', { onClick: childClick })), container);
    const span = container.querySelector('span')!;
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(childClick).toHaveBeenCalledOnce();
    expect(parentClick).toHaveBeenCalledOnce();
  });

  it('fires child handler before parent (bubble order)', () => {
    const order: string[] = [];
    render(
      createElement(
        'div',
        { onClick: () => order.push('parent') },
        createElement('span', { onClick: () => order.push('child') })
      ),
      container
    );
    container.querySelector('span')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(order).toEqual(['child', 'parent']);
  });

  it('capture handlers fire before bubble handlers, in top-down order', () => {
    const order: string[] = [];
    render(
      createElement(
        'div',
        { onClickCapture: () => order.push('parent-capture') },
        createElement('span', { onClick: () => order.push('child-bubble') })
      ),
      container
    );
    container.querySelector('span')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(order[0]).toBe('parent-capture');
    expect(order[1]).toBe('child-bubble');
  });

  it('stopPropagation halts remaining bubble handlers', () => {
    const parentClick = vi.fn();
    render(
      createElement(
        'div',
        { onClick: parentClick },
        createElement('span', { onClick: (e: SyntheticEvent) => e.stopPropagation() })
      ),
      container
    );
    container.querySelector('span')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('stopPropagation in capture phase halts remaining handlers', () => {
    const childBubble = vi.fn();
    render(
      createElement(
        'div',
        { onClickCapture: (e: SyntheticEvent) => e.stopPropagation() },
        createElement('span', { onClick: childBubble })
      ),
      container
    );
    container.querySelector('span')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(childBubble).not.toHaveBeenCalled();
  });

  it('event targeting a node outside the vdom fires no handlers', () => {
    const onClick = vi.fn();
    render(createElement('div', { onClick }), container);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
    outside.remove();
  });

  it('sets currentTarget on synthetic event to the element with handler', () => {
    let capturedTarget: EventTarget | null = null;
    render(
      createElement('div', {
        onClick: (e: SyntheticEvent) => {
          capturedTarget = e.currentTarget;
        },
      }),
      container
    );
    const div = container.querySelector('div')!;
    div.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(capturedTarget).toBe(div);
  });

  it('dispatches directly via dispatchDelegatedEvent without going through document', () => {
    const onClick = vi.fn();
    render(createElement('div', { onClick }), container);
    const div = container.querySelector('div')!;
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: div, writable: false });
    dispatchDelegatedEvent(event, runtime);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

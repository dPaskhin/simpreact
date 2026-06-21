import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domAdapter } from '../../../../main/dom/index.js';
import {
  addControlledTextareaEventHandlers,
  isEventNameIgnored,
  removeControlledTextareaEventHandlers,
  syncControlledTextareaProps,
} from '../../../../main/dom/props/controlled/textarea.js';
import { createRenderer } from '../../../../main/dom/render.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('isEventNameIgnored', () => {
  it('ignores onChange', () => expect(isEventNameIgnored('onChange')).toBe(true));
  it('ignores onInput', () => expect(isEventNameIgnored('onInput')).toBe(true));
  it('does not ignore onClick', () => expect(isEventNameIgnored('onClick')).toBe(false));
});

describe('addControlledTextareaEventHandlers / removeControlledTextareaEventHandlers', () => {
  it('attaches both input and change listeners', () => {
    const runtime = makeRuntime();
    const dom = document.createElement('textarea');
    const spy = vi.spyOn(dom, 'addEventListener');
    addControlledTextareaEventHandlers(dom, runtime);
    const events = spy.mock.calls.map(c => c[0]);
    expect(events).toContain('input');
    expect(events).toContain('change');
  });

  it('removes both input and change listeners', () => {
    const runtime = makeRuntime();
    const dom = document.createElement('textarea');
    addControlledTextareaEventHandlers(dom, runtime);
    const removeSpy = vi.spyOn(dom, 'removeEventListener');
    removeControlledTextareaEventHandlers(dom, runtime);
    const events = removeSpy.mock.calls.map(c => c[0]);
    expect(events).toContain('input');
    expect(events).toContain('change');
  });
});

describe('syncControlledTextareaProps', () => {
  let dom: HTMLTextAreaElement;
  let el: ReturnType<typeof createElement>;

  beforeEach(() => {
    dom = document.createElement('textarea');
    el = createElement('textarea');
    el.reference = dom;
  });

  it('sets value and defaultValue when value prop differs from DOM', () => {
    dom.value = 'old';
    syncControlledTextareaProps(el, { value: 'new' });
    expect(dom.value).toBe('new');
    expect(dom.defaultValue).toBe('new');
  });

  it('is a no-op when value matches DOM', () => {
    dom.value = 'same';
    const spy = vi.spyOn(HTMLTextAreaElement.prototype, 'value', 'set');
    syncControlledTextareaProps(el, { value: 'same' });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('sets defaultValue on mounting when value is null and defaultValue provided', () => {
    syncControlledTextareaProps(el, { defaultValue: 'init' }, true);
    expect(dom.value).toBe('init');
    expect(dom.defaultValue).toBe('init');
  });

  it('is a no-op when value is null and not mounting', () => {
    dom.value = 'existing';
    syncControlledTextareaProps(el, {}, false);
    expect(dom.value).toBe('existing');
  });

  it('is a no-op when value is null, mounting, and defaultValue is null', () => {
    syncControlledTextareaProps(el, {}, true);
    expect(dom.value).toBe('');
  });

  it('is a no-op when value is null, mounting, and defaultValue matches DOM', () => {
    dom.defaultValue = 'same';
    dom.value = 'same';
    const spy = vi.spyOn(HTMLTextAreaElement.prototype, 'value', 'set');
    syncControlledTextareaProps(el, { defaultValue: 'same' }, true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('controlled textarea event handlers (integration)', () => {
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
  });

  it('input handler: syncs value after onInput fires', () => {
    const onInput = vi.fn();
    render(createElement('textarea', { value: 'controlled', onInput }), container);
    const textarea = container.querySelector('textarea')!;
    textarea.value = 'user-typed';
    textarea.dispatchEvent(new Event('input'));
    expect(onInput).toHaveBeenCalledOnce();
    expect(textarea.value).toBe('controlled');
  });

  it('input handler: syncs value even without onInput prop', () => {
    render(createElement('textarea', { value: 'fixed' }), container);
    const textarea = container.querySelector('textarea')!;
    textarea.value = 'user-typed';
    textarea.dispatchEvent(new Event('input'));
    expect(textarea.value).toBe('fixed');
  });

  it('change handler: syncs value after onChange fires', () => {
    const onChange = vi.fn();
    render(createElement('textarea', { value: 'controlled', onChange }), container);
    const textarea = container.querySelector('textarea')!;
    textarea.value = 'user-typed';
    textarea.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledOnce();
    expect(textarea.value).toBe('controlled');
  });

  it('change handler: syncs value without onChange prop', () => {
    render(createElement('textarea', { value: 'fixed' }), container);
    const textarea = container.querySelector('textarea')!;
    textarea.value = 'user-typed';
    textarea.dispatchEvent(new Event('change'));
    expect(textarea.value).toBe('fixed');
  });

  it('input handler: early-returns when target is not in the dom map', () => {
    render(createElement('textarea', { value: 'controlled' }), container);
    const textarea = container.querySelector('textarea')!;
    domAdapter.detachElementFromReference(textarea, runtime);
    expect(() => textarea.dispatchEvent(new Event('input'))).not.toThrow();
  });

  it('change handler: early-returns when target is not in the dom map', () => {
    render(createElement('textarea', { value: 'controlled' }), container);
    const textarea = container.querySelector('textarea')!;
    domAdapter.detachElementFromReference(textarea, runtime);
    expect(() => textarea.dispatchEvent(new Event('change'))).not.toThrow();
  });
});

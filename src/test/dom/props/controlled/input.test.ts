import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domAdapter } from '../../../../main/dom/index.js';
import {
  addControlledInputEventHandlers,
  isCheckedType,
  isEventNameIgnored,
  removeControlledInputEventHandlers,
  syncControlledInputProps,
} from '../../../../main/dom/props/controlled/input.js';
import { createRenderer } from '../../../../main/dom/render.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('isCheckedType', () => {
  it('returns true for checkbox', () => expect(isCheckedType('checkbox')).toBe(true));
  it('returns true for radio', () => expect(isCheckedType('radio')).toBe(true));
  it('returns false for text', () => expect(isCheckedType('text')).toBe(false));
  it('returns false for empty string', () => expect(isCheckedType('')).toBe(false));
});

describe('isEventNameIgnored', () => {
  it('ignores onChange for checkbox', () => {
    expect(isEventNameIgnored({ type: 'checkbox' }, 'onChange')).toBe(true);
  });
  it('does not ignore onInput for checkbox', () => {
    expect(isEventNameIgnored({ type: 'checkbox' }, 'onInput')).toBe(false);
  });
  it('ignores onChange for radio', () => {
    expect(isEventNameIgnored({ type: 'radio' }, 'onChange')).toBe(true);
  });
  it('ignores onInput for text input', () => {
    expect(isEventNameIgnored({ type: 'text' }, 'onInput')).toBe(true);
  });
  it('does not ignore onChange for text input', () => {
    expect(isEventNameIgnored({ type: 'text' }, 'onChange')).toBe(false);
  });
});

describe('addControlledInputEventHandlers / removeControlledInputEventHandlers', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let dom: HTMLInputElement;

  beforeEach(() => {
    runtime = makeRuntime();
    dom = document.createElement('input');
  });

  it('attaches an input listener for text inputs', () => {
    const spy = vi.spyOn(dom, 'addEventListener');
    addControlledInputEventHandlers(dom, runtime);
    expect(spy).toHaveBeenCalledWith('input', expect.any(Function));
  });

  it('attaches a change listener for checkboxes', () => {
    dom.type = 'checkbox';
    const spy = vi.spyOn(dom, 'addEventListener');
    addControlledInputEventHandlers(dom, runtime);
    expect(spy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('attaches a change listener for radio inputs', () => {
    dom.type = 'radio';
    const spy = vi.spyOn(dom, 'addEventListener');
    addControlledInputEventHandlers(dom, runtime);
    expect(spy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes the same listener that was added (same reference via WeakMap)', () => {
    addControlledInputEventHandlers(dom, runtime);
    const removeSpy = vi.spyOn(dom, 'removeEventListener');
    removeControlledInputEventHandlers(dom, runtime);
    expect(removeSpy).toHaveBeenCalledWith('input', expect.any(Function));
  });

  it('two runtimes get independent handlers', () => {
    const runtime2 = makeRuntime();
    const spy1 = vi.spyOn(dom, 'addEventListener');
    addControlledInputEventHandlers(dom, runtime);
    const handler1 = spy1.mock.calls[0]![1] as Function;
    spy1.mockClear();
    addControlledInputEventHandlers(dom, runtime2);
    const handler2 = spy1.mock.calls[0]![1] as Function;
    expect(handler1).not.toBe(handler2);
  });
});

describe('syncControlledInputProps', () => {
  let el: ReturnType<typeof createElement>;
  let dom: HTMLInputElement;

  beforeEach(() => {
    dom = document.createElement('input');
    el = createElement('input');
    el.reference = dom;
  });

  it('sets dom.type when it differs from prop', () => {
    syncControlledInputProps(el, { type: 'email' });
    expect(dom.getAttribute('type')).toBe('email');
  });

  it('skips dom.type when already matching', () => {
    dom.type = 'text';
    const spy = vi.spyOn(dom, 'setAttribute');
    syncControlledInputProps(el, { type: 'text' });
    expect(spy).not.toHaveBeenCalledWith('type', expect.anything());
  });

  it('sets dom.multiple when prop differs', () => {
    syncControlledInputProps(el, { multiple: true });
    expect(dom.multiple).toBe(true);
  });

  it('sets dom.defaultValue when defaultValue is provided and no value prop', () => {
    syncControlledInputProps(el, { defaultValue: 'default' });
    expect(dom.defaultValue).toBe('default');
  });

  it('does not set defaultValue when value prop is also present', () => {
    syncControlledInputProps(el, { value: 'v', defaultValue: 'default' });
    expect(dom.defaultValue).not.toBe('default');
  });

  it('sets dom.checked for checkbox when checked prop is provided', () => {
    syncControlledInputProps(el, { type: 'checkbox', checked: true });
    expect(dom.checked).toBe(true);
  });

  it('skips dom.checked for checkbox when checked prop is absent', () => {
    dom.checked = false;
    syncControlledInputProps(el, { type: 'checkbox' });
    expect(dom.checked).toBe(false);
  });

  it('sets dom.value and dom.defaultValue for text when value differs from DOM', () => {
    dom.value = 'old';
    syncControlledInputProps(el, { value: 'new' });
    expect(dom.value).toBe('new');
    expect(dom.defaultValue).toBe('new');
  });

  it('skips dom.value assignment when value matches DOM', () => {
    dom.value = 'same';
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!;
    const spy = vi.spyOn(HTMLInputElement.prototype, 'value', 'set');
    syncControlledInputProps(el, { value: 'same' });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    void descriptor;
  });
});

describe('controlled input event handlers (integration)', () => {
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

  it('input handler: syncs value back to DOM after onInput fires', () => {
    const onInput = vi.fn();
    render(createElement('input', { value: 'controlled', onInput }), container);
    const input = container.querySelector('input')!;
    input.value = 'user-typed';
    input.dispatchEvent(new Event('input'));
    expect(onInput).toHaveBeenCalledOnce();
    expect(input.value).toBe('controlled');
  });

  it('input handler: syncs value even when no onInput prop', () => {
    render(createElement('input', { value: 'fixed' }), container);
    const input = container.querySelector('input')!;
    input.value = 'user-typed';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('fixed');
  });

  it('change handler: syncs checked back to DOM after onChange fires for checkbox', () => {
    const onChange = vi.fn();
    render(createElement('input', { type: 'checkbox', checked: false, onChange }), container);
    const input = container.querySelector('input')!;
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledOnce();
    expect(input.checked).toBe(false);
  });

  it('change handler: syncs checked even when no onChange prop for checkbox', () => {
    render(createElement('input', { type: 'checkbox', checked: false }), container);
    const input = container.querySelector('input')!;
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(input.checked).toBe(false);
  });

  it('input handler: early-returns when target is not in the dom map', () => {
    render(createElement('input', { value: 'controlled' }), container);
    const input = container.querySelector('input')!;
    // Remove element from the map so the handler finds nothing
    domAdapter.detachElementFromReference(input, runtime);
    expect(() => input.dispatchEvent(new Event('input'))).not.toThrow();
  });

  it('change handler: early-returns when target is not in the dom map for checkbox', () => {
    render(createElement('input', { type: 'checkbox', checked: false }), container);
    const input = container.querySelector('input')!;
    domAdapter.detachElementFromReference(input, runtime);
    expect(() => input.dispatchEvent(new Event('change'))).not.toThrow();
  });
});

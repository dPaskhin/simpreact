import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { domAdapter } from '../../../../main/dom/index.js';
import {
  addControlledFormElementEventHandlers,
  isEventNameIgnored,
  isFormElementControlled,
  removeControlledFormElementEventHandlers,
  syncControlledFormElementPropsWithAttrs,
} from '../../../../main/dom/props/controlled/index.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('isFormElementControlled', () => {
  it('returns true when value is non-null', () => {
    expect(isFormElementControlled({ value: '' })).toBe(true);
  });
  it('returns true when checked is non-null', () => {
    expect(isFormElementControlled({ checked: false })).toBe(true);
  });
  it('returns false when neither value nor checked is set', () => {
    expect(isFormElementControlled({})).toBe(false);
  });
  it('returns false when value is null', () => {
    expect(isFormElementControlled({ value: null })).toBe(false);
  });
});

describe('isEventNameIgnored (dispatcher)', () => {
  it('delegates to input logic for input elements', () => {
    const el = createElement('input', { type: 'checkbox' });
    expect(isEventNameIgnored(el, 'onChange')).toBe(true);
    expect(isEventNameIgnored(el, 'onInput')).toBe(false);
  });

  it('delegates to select logic for select elements', () => {
    const el = createElement('select');
    expect(isEventNameIgnored(el, 'onChange')).toBe(true);
    expect(isEventNameIgnored(el, 'onInput')).toBe(false);
  });

  it('delegates to textarea logic for textarea elements', () => {
    const el = createElement('textarea');
    expect(isEventNameIgnored(el, 'onChange')).toBe(true);
    expect(isEventNameIgnored(el, 'onInput')).toBe(true);
  });

  it('returns false for unknown element types', () => {
    const el = createElement('div');
    expect(isEventNameIgnored(el, 'onChange')).toBe(false);
  });
});

describe('addControlledFormElementEventHandlers', () => {
  let runtime: ReturnType<typeof makeRuntime>;

  beforeEach(() => {
    runtime = makeRuntime();
  });

  it('adds handlers for input element', () => {
    const el = createElement('input');
    const dom = document.createElement('input');
    el.reference = dom;
    const spy = vi.spyOn(dom, 'addEventListener');
    addControlledFormElementEventHandlers(el, runtime);
    expect(spy).toHaveBeenCalled();
  });

  it('adds handlers for select element', () => {
    const el = createElement('select');
    const dom = document.createElement('select');
    el.reference = dom;
    const spy = vi.spyOn(dom, 'addEventListener');
    addControlledFormElementEventHandlers(el, runtime);
    expect(spy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('adds handlers for textarea element', () => {
    const el = createElement('textarea');
    const dom = document.createElement('textarea');
    el.reference = dom;
    const spy = vi.spyOn(dom, 'addEventListener');
    addControlledFormElementEventHandlers(el, runtime);
    const events = spy.mock.calls.map(c => c[0]);
    expect(events).toContain('input');
    expect(events).toContain('change');
  });

  it('is a no-op for unknown element types', () => {
    const el = createElement('div');
    el.reference = document.createElement('div');
    expect(() => addControlledFormElementEventHandlers(el, runtime)).not.toThrow();
  });
});

describe('removeControlledFormElementEventHandlers', () => {
  let runtime: ReturnType<typeof makeRuntime>;

  beforeEach(() => {
    runtime = makeRuntime();
  });

  it('removes handlers for input element', () => {
    const el = createElement('input');
    const dom = document.createElement('input');
    el.reference = dom;
    addControlledFormElementEventHandlers(el, runtime);
    const spy = vi.spyOn(dom, 'removeEventListener');
    removeControlledFormElementEventHandlers(el, runtime);
    expect(spy).toHaveBeenCalled();
  });

  it('removes handlers for select element', () => {
    const el = createElement('select');
    const dom = document.createElement('select');
    el.reference = dom;
    addControlledFormElementEventHandlers(el, runtime);
    const spy = vi.spyOn(dom, 'removeEventListener');
    removeControlledFormElementEventHandlers(el, runtime);
    expect(spy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes handlers for textarea element', () => {
    const el = createElement('textarea');
    const dom = document.createElement('textarea');
    el.reference = dom;
    addControlledFormElementEventHandlers(el, runtime);
    const spy = vi.spyOn(dom, 'removeEventListener');
    removeControlledFormElementEventHandlers(el, runtime);
    const events = spy.mock.calls.map(c => c[0]);
    expect(events).toContain('input');
    expect(events).toContain('change');
  });

  it('is a no-op for unknown element types', () => {
    const el = createElement('div');
    el.reference = document.createElement('div');
    expect(() => removeControlledFormElementEventHandlers(el, runtime)).not.toThrow();
  });
});

describe('syncControlledFormElementPropsWithAttrs', () => {
  it('syncs input props', () => {
    const el = createElement('input');
    const dom = document.createElement('input');
    el.reference = dom;
    dom.value = 'old';
    syncControlledFormElementPropsWithAttrs(el, { value: 'new' });
    expect(dom.value).toBe('new');
  });

  it('syncs select props', () => {
    const el = createElement('select');
    const dom = document.createElement('select');
    const opt = document.createElement('option');
    opt.value = 'a';
    dom.appendChild(opt);
    el.reference = dom;
    syncControlledFormElementPropsWithAttrs(el, { value: 'a' }, true);
    expect(dom.options[0]!.selected).toBe(true);
  });

  it('syncs textarea props', () => {
    const el = createElement('textarea');
    const dom = document.createElement('textarea');
    el.reference = dom;
    dom.value = 'old';
    syncControlledFormElementPropsWithAttrs(el, { value: 'new' });
    expect(dom.value).toBe('new');
  });

  it('is a no-op for unknown element types', () => {
    const el = createElement('div');
    el.reference = document.createElement('div');
    expect(() => syncControlledFormElementPropsWithAttrs(el, {})).not.toThrow();
  });
});

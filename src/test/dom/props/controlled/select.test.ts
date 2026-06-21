import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domAdapter } from '../../../../main/dom/index.js';
import {
  addControlledSelectEventHandlers,
  isEventNameIgnored,
  removeControlledSelectEventHandlers,
  syncControlledSelectProps,
} from '../../../../main/dom/props/controlled/select.js';
import { createRenderer } from '../../../../main/dom/render.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('isEventNameIgnored', () => {
  it('ignores onChange', () => expect(isEventNameIgnored('onChange')).toBe(true));
  it('does not ignore onInput', () => expect(isEventNameIgnored('onInput')).toBe(false));
  it('does not ignore onClick', () => expect(isEventNameIgnored('onClick')).toBe(false));
});

describe('addControlledSelectEventHandlers / removeControlledSelectEventHandlers', () => {
  it('attaches a change listener', () => {
    const runtime = makeRuntime();
    const dom = document.createElement('select');
    const spy = vi.spyOn(dom, 'addEventListener');
    addControlledSelectEventHandlers(dom, runtime);
    expect(spy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes the same listener that was added', () => {
    const runtime = makeRuntime();
    const dom = document.createElement('select');
    addControlledSelectEventHandlers(dom, runtime);
    const removeSpy = vi.spyOn(dom, 'removeEventListener');
    removeControlledSelectEventHandlers(dom, runtime);
    expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

describe('syncControlledSelectProps', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let container: HTMLDivElement;
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

  function renderSelect(props: Record<string, any>, options: Array<{ value: string; label: string }>) {
    const optionEls = options.map(o => createElement('option', { value: o.value }, o.label));
    render(createElement('select', props, ...optionEls), container);
    return container.querySelector('select')!;
  }

  it('sets multiple on DOM element when prop differs', () => {
    const select = renderSelect({ value: 'a', multiple: true }, [{ value: 'a', label: 'A' }]);
    const el = runtime.hostAdapter.getElementFromReference(select, runtime)!;
    syncControlledSelectProps(el, { multiple: true });
    expect(select.multiple).toBe(true);
  });

  it('sets selectedIndex to -1 when prop is -1', () => {
    const select = renderSelect({ value: 'a' }, [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
    const el = runtime.hostAdapter.getElementFromReference(select, runtime)!;
    syncControlledSelectProps(el, { selectedIndex: -1 });
    expect(select.selectedIndex).toBe(-1);
  });

  it('uses selectedIndex option value when selectedIndex > -1', () => {
    const select = renderSelect({ value: 'b' }, [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
    const el = runtime.hostAdapter.getElementFromReference(select, runtime)!;
    syncControlledSelectProps(el, { selectedIndex: 0 });
    expect(select.options[0]!.selected).toBe(true);
  });

  it('selects the option matching value prop', () => {
    const select = renderSelect({ value: 'b' }, [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
    const el = runtime.hostAdapter.getElementFromReference(select, runtime)!;
    syncControlledSelectProps(el, { value: 'b' });
    expect(select.options[1]!.selected).toBe(true);
    expect(select.options[0]!.selected).toBe(false);
  });

  it('selects multiple options when value is an array', () => {
    const select = renderSelect({ value: ['a', 'c'], multiple: true }, [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C' },
    ]);
    const el = runtime.hostAdapter.getElementFromReference(select, runtime)!;
    syncControlledSelectProps(el, { value: ['a', 'c'], multiple: true });
    expect(select.options[0]!.selected).toBe(true);
    expect(select.options[1]!.selected).toBe(false);
    expect(select.options[2]!.selected).toBe(true);
  });

  it('uses defaultValue on mounting when value is null', () => {
    const select = renderSelect({}, [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
    const el = runtime.hostAdapter.getElementFromReference(select, runtime)!;
    syncControlledSelectProps(el, { defaultValue: 'b' }, true);
    expect(select.options[1]!.selected).toBe(true);
  });

  it('ignores defaultValue when not mounting', () => {
    const select = renderSelect({ value: 'a' }, [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
    const el = runtime.hostAdapter.getElementFromReference(select, runtime)!;
    syncControlledSelectProps(el, { defaultValue: 'b' }, false);
    expect(select.options[1]!.selected).toBe(false);
  });

  it('deselects option when value does not match and no selected prop', () => {
    const select = renderSelect({ value: 'a' }, [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
    const el = runtime.hostAdapter.getElementFromReference(select, runtime)!;
    syncControlledSelectProps(el, { value: 'a' });
    expect(select.options[1]!.selected).toBe(false);
  });

  it('sets option.selected from props.selected when value is null and option has selected prop', () => {
    const select = renderSelect({ value: 'a' }, [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);
    const el = runtime.hostAdapter.getElementFromReference(select, runtime)!;
    const optionEl = (el.children as any[])[1];
    optionEl.props = { ...optionEl.props, selected: true };
    syncControlledSelectProps(el, {});
    expect(select.options[1]!.selected).toBe(true);
  });

  it('skips option with no DOM reference', () => {
    const optionEl = createElement('option', { value: 'x' });
    const selectEl = createElement('select');
    selectEl.reference = document.createElement('select');
    selectEl.children = optionEl;
    // SIMP_ELEMENT_CHILD_FLAG_ELEMENT = 4 — makes hasElementChild return true so updateOption is reached
    (selectEl as any).childFlag = 4;
    expect(() => syncControlledSelectProps(selectEl, { value: 'x' })).not.toThrow();
  });

  it('updateOption falls back to emptyObject when option has null props', () => {
    const optionEl = createElement('option');
    optionEl.props = null;
    optionEl.reference = document.createElement('option');
    const selectEl = createElement('select');
    selectEl.reference = document.createElement('select');
    selectEl.children = optionEl;
    (selectEl as any).childFlag = 4;
    expect(() => syncControlledSelectProps(selectEl, { value: 'x' })).not.toThrow();
  });
});

describe('controlled select change handler (integration)', () => {
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

  it('fires onChange and resets selection to match value prop', () => {
    const onChange = vi.fn();
    render(
      createElement(
        'select',
        { value: 'a', onChange },
        createElement('option', { value: 'a' }, 'A'),
        createElement('option', { value: 'b' }, 'B')
      ),
      container
    );
    const select = container.querySelector('select')!;
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledOnce();
    expect(select.options[0]!.selected).toBe(true);
  });

  it('syncs selection even without onChange prop', () => {
    render(
      createElement(
        'select',
        { value: 'a' },
        createElement('option', { value: 'a' }, 'A'),
        createElement('option', { value: 'b' }, 'B')
      ),
      container
    );
    const select = container.querySelector('select')!;
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    expect(select.options[0]!.selected).toBe(true);
  });

  it('change handler: early-returns when target is not in the dom map', () => {
    render(createElement('select', { value: 'a' }, createElement('option', { value: 'a' }, 'A')), container);
    const select = container.querySelector('select')!;
    domAdapter.detachElementFromReference(select, runtime);
    expect(() => select.dispatchEvent(new Event('change'))).not.toThrow();
  });
});
